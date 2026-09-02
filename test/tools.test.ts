import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { createBase } from '../src/bases.ts'
import { type JobRunner } from '../src/jobs.ts'
import { setDataRootForTest } from '../src/paths.ts'
import { registerKbTools } from '../src/tools.ts'

type ToolDef = {
  name: string
  execute: (args?: unknown) => Promise<unknown>
  output: {
    render: (args: unknown, value: unknown) => Array<{ type: string; text: string }>
    presentationMeta?: (args: unknown, value: unknown) => unknown
  }
  presentCall?: () => { card: string; title: string }
  presentResult?: (args: unknown, result: { isError: boolean }) => { card: string; title: string }
  isConcurrencySafe?: () => boolean
  parameters?: { required?: string[] }
}

function instantJobs(): JobRunner {
  return {
    enqueue: async (_op, work) => work(),
    status: () => ({ running: false, failed: [] }),
  }
}

function capture(jobs: JobRunner = instantJobs()): Map<string, ToolDef> {
  const tools = new Map<string, ToolDef>()
  registerKbTools({
    tools: {
      register: (def: unknown) => {
        const item = def as ToolDef
        tools.set(item.name, item)
        return () => {}
      },
    },
  }, jobs)
  return tools
}

async function withRoot(fn: (root: string, tools: Map<string, ToolDef>) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'zy-tool-'))
  setDataRootForTest(root)
  try {
    await fn(root, capture())
  } finally {
    setDataRootForTest(undefined)
    await rm(root, { recursive: true, force: true })
  }
}

describe('kb tools', { concurrency: false }, () => {
  test('注册三件套：list / ingest / search', () => {
    const tools = capture()
    assert.deepEqual([...tools.keys()].sort(), ['kb_ingest', 'kb_list_bases', 'kb_search'])
    assert.equal(tools.get('kb_list_bases')?.isConcurrencySafe?.(), true)
    assert.deepEqual(tools.get('kb_ingest')?.parameters?.required, ['baseId', 'sourcePath'])
    assert.deepEqual(tools.get('kb_search')?.parameters?.required, ['baseId', 'query'])
  })

  test('kb_list_bases：空库文案与有库卡片', async () => {
    await withRoot(async (root, tools) => {
      const list = tools.get('kb_list_bases')
      if (!list) throw new Error('missing')
      const empty = await list.execute()
      assert.deepEqual(empty, { bases: [] })
      assert.equal(list.output.render({}, empty)[0].text, '还没有知识库')
      const base = await createBase(root, { title: '工作库', description: '描述' })
      const filled = await list.execute() as { bases: Array<{ id: string; title: string }> }
      assert.equal(filled.bases[0].id, base.id)
      assert.equal(Object.prototype.hasOwnProperty.call(filled.bases[0], 'lastDestCategory'), false)
      assert.match(list.output.render({}, filled)[0].text, new RegExp(`${base.id} 工作库`))
    })
  })

  test('kb_ingest：缺参、缺库、成功入队', async () => {
    await withRoot(async (root, tools) => {
      const ingest = tools.get('kb_ingest')
      if (!ingest) throw new Error('missing')
      await assert.rejects(() => ingest.execute({}), /baseId 必填/)
      await assert.rejects(() => ingest.execute({ baseId: '  ', sourcePath: '/tmp/a.md' }), /baseId 必填/)
      await assert.rejects(() => ingest.execute({ baseId: 'work' }), /sourcePath 必填/)
      await assert.rejects(() => ingest.execute({ baseId: 'life', sourcePath: join(root, 'a.md') }), /先建库/)
      const base = await createBase(root, { title: '工作库', description: '描述' })
      const src = join(root, 'a.md')
      await writeFile(src, 'hello')
      const result = await ingest.execute({
        baseId: base.id,
        sourcePath: src,
        destCategory: '合同/2024',
      }) as { copied: string[]; skipped: number; failed: number }
      assert.ok(result.copied.includes('合同/2024/a.md'))
      assert.match(ingest.output.render({}, result)[0].text, /导入 1/)
      assert.match(ingest.output.render({}, {})[0].text, /导入 0 · 跳过 0 · 失败 0/)
    })
  })

  test('kb_search：必须带 baseId；query 必填；无命中空列表', async () => {
    await withRoot(async (root, tools) => {
      const search = tools.get('kb_search')
      if (!search) throw new Error('missing')
      await assert.rejects(() => search.execute({ query: '违约' }), /必须带 baseId/)
      await assert.rejects(() => search.execute(null), /必须带 baseId/)
      await assert.rejects(() => search.execute({ baseId: 'work' }), /query 必填/)
      const base = await createBase(root, { title: '工作库', description: '描述' })
      const empty = await search.execute({ baseId: base.id, query: '违约' }) as { hits: unknown[] }
      assert.deepEqual(empty.hits, [])
      assert.equal(search.output.render({}, empty)[0].text, '无命中')
      const meta = {
        hits: [{ n: 1, path: 'a.md', startLine: 1, endLine: 3, matchLine: 2, excerpt: '第一行\n命中的正文\n第三行' }],
        warnings: [],
      }
      const rendered = search.output.render({}, meta)[0].text
      assert.match(rendered, /`1` a\.md:1–3/)
      assert.doesNotMatch(rendered, /\[1\]/)
      assert.match(rendered, /命中的正文/)
      assert.equal(search.output.presentationMeta?.({}, meta), meta)
      assert.deepEqual(search.presentCall?.(), { card: 'generic', title: '知识库检索' })
      assert.deepEqual(search.presentResult?.({}, { isError: false }), { card: 'generic', title: '知识库命中' })
      assert.deepEqual(search.presentResult?.({}, { isError: true }), { card: 'generic', title: '检索失败' })
    })
  })

  test('kb_ingest 把 KbError 转成普通 Error', async () => {
    await withRoot(async (root, tools) => {
      const ingest = tools.get('kb_ingest')
      if (!ingest) throw new Error('missing')
      const base = await createBase(root, { title: '工作库', description: '描述' })
      await assert.rejects(async () => {
        try {
          await ingest.execute({
            baseId: base.id,
            sourcePath: srcMissing(root),
            destCategory: '../life',
          })
        } catch (error) {
          assert.equal(error instanceof Error, true)
          assert.equal((error as Error).name, 'Error')
          throw error
        }
      }, /源路径不存在|类目必须是库内相对路径/)
    })
  })
})

function srcMissing(root: string): string {
  return join(root, 'no-such.md')
}

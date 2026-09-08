import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { createBase } from '../src/service/kb/bases.ts'
import { type JobRunner } from '../src/platform/jobs.ts'
import { setDataRootForTest } from '../src/platform/paths.ts'
import { VERSION_LABEL } from '../src/model/constants.ts'
import { registerKbTools } from '../src/controller/tools.ts'

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
  parameters?: {
    required?: string[]
    oneOf?: Array<{ required?: string[] }>
  }
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
  test('注册三件套：list / import / search', () => {
    const tools = capture()
    assert.deepEqual([...tools.keys()].sort(), ['kb_import', 'kb_list_bases', 'kb_search'])
    assert.equal(tools.get('kb_list_bases')?.isConcurrencySafe?.(), true)
    assert.deepEqual(tools.get('kb_import')?.parameters?.required, ['baseId', 'sourcePath'])
    const searchParameters = tools.get('kb_search')?.parameters
    assert.deepEqual(searchParameters?.oneOf?.map((item) => item.required), [['baseId', 'query'], ['cursor']])
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
      assert.equal(filled.bases[0].title, '工作库')
      assert.equal(Object.prototype.hasOwnProperty.call(filled.bases[0], 'lastDestCategory'), false)
      assert.equal(list.output.render({}, filled)[0].text, `${base.id} 工作库 · 知源 ${VERSION_LABEL}`)
    })
  })

  test('kb_import：缺参、缺库、成功入队', async () => {
    await withRoot(async (root, tools) => {
      const importTool = tools.get('kb_import')
      if (!importTool) throw new Error('missing')
      await assert.rejects(() => importTool.execute({}), /baseId 必填/)
      await assert.rejects(() => importTool.execute({ baseId: '  ', sourcePath: '/tmp/a.md' }), /baseId 必填/)
      await assert.rejects(() => importTool.execute({ baseId: 'work' }), /sourcePath 必填/)
      await assert.rejects(() => importTool.execute({ baseId: 'life', sourcePath: join(root, 'a.md') }), /先建库/)
      const base = await createBase(root, { title: '工作库', description: '描述' })
      const src = join(root, 'a.md')
      await writeFile(src, 'hello')
      const result = await importTool.execute({
        baseId: base.id,
        sourcePath: src,
        destCategory: '合同/2024',
      }) as { copied: string[]; skipped: number; failed: number }
      assert.ok(result.copied.includes('合同/2024/a.md'))
      assert.match(importTool.output.render({}, result)[0].text, /导入 1/)
      assert.match(importTool.output.render({}, {})[0].text, /导入 0 · 跳过 0 · 失败 0/)
    })
  })

  test('kb_search：首次返回 overview，path 查询返回 file-detail', async () => {
    await withRoot(async (root, tools) => {
      const search = tools.get('kb_search')
      if (!search) throw new Error('missing')
      await assert.rejects(() => search.execute({ query: '违约' }), /baseId 必填/)
      await assert.rejects(() => search.execute(null), /baseId 必填/)
      await assert.rejects(() => search.execute({ baseId: 'work' }), /query 必填/)
      const base = await createBase(root, { title: '工作库', description: '描述' })
      const empty = await search.execute({ baseId: base.id, query: '违约' }) as {
        kind: string
        scope: string
        files: unknown[]
        page: { scope: string; returnedFiles: number; hasMore: boolean }
      }
      assert.equal(empty.kind, 'overview')
      assert.equal(empty.scope, 'files')
      assert.deepEqual(empty.files, [])
      assert.equal(empty.page.returnedFiles, 0)
      assert.equal(search.output.render({}, empty)[0].text, '知识库中没有找到相关文件')
      const overview = {
        kind: 'overview' as const,
        scope: 'files' as const,
        baseId: base.id,
        query: { terms: ['违约'], aliases: [] },
        files: [{ path: 'a.md', format: 'markdown' as const, totalHits: 1 }],
        totalFiles: 1,
        totalHits: 1,
        page: { scope: 'files' as const, returnedFiles: 1, hasMore: true, nextCursor: 'cursor' },
        scan: { complete: true, warnings: [] },
        presentation: { template: 'search-overview-card' as const, version: 1 as const },
      }
      const renderedOverview = search.output.render({}, overview)[0].text
      assert.match(renderedOverview, /【文件概览】1 个文件 · 1 条命中 · 本页 1 个文件/)
      assert.match(renderedOverview, /a\.md（1 条）/)
      assert.doesNotMatch(renderedOverview, /命中的正文/)
      assert.match(renderedOverview, /仍有更多文件/)
      const incompleteRendered = search.output.render({}, {
        ...overview,
        scan: { complete: false, warnings: ['检索结果过多，已截断'], stopReason: 'stdout-limit' },
        page: { scope: 'files' as const, returnedFiles: 1, hasMore: false },
      })[0].text
      assert.match(incompleteRendered, /扫描未完成/)
      assert.match(incompleteRendered, /停止原因：stdout-limit/)
      const detail = {
        kind: 'file-detail' as const,
        scope: 'hits' as const,
        baseId: base.id,
        query: { terms: ['违约'], aliases: [] },
        path: 'a.md',
        format: 'markdown' as const,
        totalHits: 1,
        hits: [{ n: 1, path: 'a.md', startLine: 1, endLine: 3, matchLine: 2, excerpt: '第一行\\n命中的正文\\n第三行' }],
        page: { scope: 'hits' as const, returnedHits: 1, hasMore: false },
        scan: { complete: true, warnings: [] },
        presentation: { template: 'search-file-detail-card' as const, version: 1 as const },
      }
      const renderedDetail = search.output.render({}, detail)[0].text
      assert.match(renderedDetail, /`1` a\.md:1–3（命中行 2）/)
      assert.match(renderedDetail, /命中的正文/)
      assert.match(renderedDetail, /【文件详情】a\.md · 1 条命中 · 本页 1 条/)
      assert.deepEqual(search.output.presentationMeta?.({}, overview), overview)
      assert.deepEqual(search.output.presentationMeta?.({}, detail), detail)
      assert.deepEqual(search.presentCall?.(), { card: 'generic', title: '知识库检索' })
      assert.deepEqual(search.presentResult?.({}, { isError: false }), { card: 'generic', title: '知识库检索结果' })
      assert.deepEqual(search.presentResult?.({}, { isError: true }), { card: 'generic', title: '检索失败' })
    })
  })

  test('kb_import 把 KbError 转成普通 Error', async () => {
    await withRoot(async (root, tools) => {
      const importTool = tools.get('kb_import')
      if (!importTool) throw new Error('missing')
      const base = await createBase(root, { title: '工作库', description: '描述' })
      await assert.rejects(async () => {
        try {
          await importTool.execute({
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

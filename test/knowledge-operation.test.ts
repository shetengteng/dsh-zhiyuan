import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { executeKnowledgeOperation } from '../src/controller/rpc/knowledge-operation-controller.ts'
import { DEFAULT_MAX_FILE_BYTES, DEFAULT_MAX_KB_BYTES } from '../src/model/constants.ts'
import type { KbCard } from '../src/model/entity/catalog.ts'
import { KbError } from '../src/model/error/kb-error.ts'
import type { ReadEntryResponse } from '../src/model/response/entry-response.ts'
import type { ImportResponse } from '../src/model/response/import-response.ts'
import type { KbSummaryResponse, KbTreeNodeResponse } from '../src/model/response/kb-response.ts'
import type { SearchResult } from '../src/model/response/search-response.ts'
import { createJobRunner } from '../src/platform/jobs.ts'
import { setDataRootForTest } from '../src/platform/paths.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from '../src/service/kb/knowledge-services.ts'

const knowledgeServices = createKnowledgeServices(new FileCatalogRepository())

/** 断言抛出指定错误码的 KbError。 */
function throwsCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KbError && error.code === code
}

test('operation 端点：建库、导入、树、读、写、检索、删条目与删库全链路', { concurrency: false }, async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'zy-operation-'))
  setDataRootForTest(dataRoot)
  const jobs = createJobRunner()
  const run = (payload: unknown): Promise<unknown> => executeKnowledgeOperation(payload, jobs, knowledgeServices)
  try {
    assert.deepEqual(await run({ op: 'list' }), [])

    const card = await run({ op: 'create', title: '示例库', description: 'RPC 用例', aliases: ['示例'] }) as KbCard
    assert.equal(card.title, '示例库')
    assert.deepEqual(card.aliases, ['示例'])
    assert.equal(existsSync(join(dataRoot, 'kbs', card.id)), true)

    const summaries = await run({ op: 'list' }) as KbSummaryResponse[]
    assert.equal(summaries.length, 1)
    assert.equal(summaries[0]?.title, '示例库')
    assert.equal(summaries[0]?.approxDocs, 0)
    assert.equal(summaries[0]?.lastUsed, true)

    // 路径导入：类目不存在时按默认 createMissing 建目录
    const source = join(dataRoot, '会议纪要.md')
    await writeFile(source, '季度沟通会：验收、延迟交付、违约金。\n')
    const imported = await run({
      op: 'import',
      kbId: card.id,
      sourcePath: source,
      destCategory: '会议/2026',
    }) as ImportResponse
    assert.deepEqual(imported.copied, ['会议/2026/会议纪要.md'])
    assert.equal(imported.failed, 0)
    assert.equal(existsSync(join(dataRoot, 'kbs', card.id, '会议', '2026', '会议纪要.md')), true)
    assert.equal(jobs.status().failed.length, 0)

    const tree = await run({ op: 'tree', id: card.id }) as KbTreeNodeResponse[]
    assert.deepEqual(tree.map((node) => [node.kind, node.path]), [['dir', '会议']])
    assert.deepEqual(tree[0]?.children?.map((node) => [node.kind, node.path]), [['dir', '会议/2026']])
    assert.deepEqual(tree[0]?.children?.[0]?.children?.map((node) => node.path), ['会议/2026/会议纪要.md'])

    const preview = await run({ op: 'read', id: card.id, path: '会议/2026/会议纪要.md' }) as ReadEntryResponse
    assert.equal(preview.kind, 'text')
    assert.equal(preview.format, 'markdown')
    if (preview.kind !== 'text') throw new Error('Markdown 预览应为文本形态')
    assert.match(preview.text, /违约金/)

    await run({ op: 'write', id: card.id, path: '会议/2026/会议纪要.md', change: { kind: 'text', text: '更新后的验收结论。\n' } })
    assert.equal(await readFile(join(dataRoot, 'kbs', card.id, '会议', '2026', '会议纪要.md'), 'utf8'), '更新后的验收结论。\n')

    const search = await run({ op: 'search', kbId: card.id, query: '验收' }) as SearchResult
    assert.equal(search.kind, 'overview')
    assert.equal(search.kbId, card.id)

    assert.deepEqual(await run({ op: 'prefs' }), {
      defaultKbId: card.id,
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxKbBytes: DEFAULT_MAX_KB_BYTES,
    })
    assert.deepEqual(await run({ op: 'setPrefs', maxFileBytes: 1024 }), {
      defaultKbId: card.id,
      maxFileBytes: 1024,
      maxKbBytes: DEFAULT_MAX_KB_BYTES,
    })

    await assert.rejects(run({ op: 'deleteEntry', id: card.id, path: '会议/2026/会议纪要.md' }), throwsCode('confirm_required'))
    assert.deepEqual(await run({ op: 'deleteEntry', id: card.id, path: '会议/2026/会议纪要.md', confirm: true }), { ok: true })
    assert.equal(existsSync(join(dataRoot, 'kbs', card.id, '会议', '2026', '会议纪要.md')), false)

    await assert.rejects(run({ op: 'deleteKb', id: card.id }), throwsCode('confirm_required'))
    assert.deepEqual(await run({ op: 'deleteKb', id: card.id, confirm: true }), { ok: true })
    assert.deepEqual(await run({ op: 'list' }), [])
  } finally {
    setDataRootForTest(undefined)
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('operation 端点：拖入字节导入按 base64 落盘并校验 sourceBase64', { concurrency: false }, async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'zy-operation-bytes-'))
  setDataRootForTest(dataRoot)
  const jobs = createJobRunner()
  const run = (payload: unknown): Promise<unknown> => executeKnowledgeOperation(payload, jobs, knowledgeServices)
  try {
    const card = await run({ op: 'create', title: '拖入库', description: '字节导入用例' }) as KbCard
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('名称,金额\n甲公司,120\n', 'utf8'),
    ])
    const imported = await run({
      op: 'import',
      kbId: card.id,
      destCategory: '表格',
      sourceName: '台账.csv',
      sourceBase64: bytes.toString('base64'),
    }) as ImportResponse
    assert.deepEqual(imported.copied, ['表格/台账.csv'])
    assert.deepEqual(await readFile(join(dataRoot, 'kbs', card.id, '表格', '台账.csv')), bytes)

    await assert.rejects(
      run({ op: 'import', kbId: card.id, destCategory: '表格', sourceName: '台账.csv', sourceBase64: 12 }),
      throwsCode('invalid_field'),
    )
    assert.equal(jobs.status().failed.length, 0)
  } finally {
    setDataRootForTest(undefined)
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('operation 端点：未知操作与缺字段在进入服务前被拒绝', { concurrency: false }, async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'zy-operation-guard-'))
  setDataRootForTest(dataRoot)
  const jobs = createJobRunner()
  const run = (payload: unknown): Promise<unknown> => executeKnowledgeOperation(payload, jobs, knowledgeServices)
  try {
    await assert.rejects(run({ op: 'rebuild' }), throwsCode('unknown_op'))
    await assert.rejects(run({ op: 'tree' }), throwsCode('missing_field'))
    await assert.rejects(run({ op: 'tree', id: 'missing' }), throwsCode('kb_missing'))
    await assert.rejects(run('list'), throwsCode('invalid_field'))
  } finally {
    setDataRootForTest(undefined)
    await rm(dataRoot, { recursive: true, force: true })
  }
})
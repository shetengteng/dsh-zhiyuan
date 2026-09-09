import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { createBase, markUsed, requireBase } from '../src/service/kb/bases.ts'
import { matchedExcerptLine, parseLabeledFields, queryTerms } from '../src/view/search/hit-display.ts'
import { searchBase as searchBaseWithAccess, type SearchRequest, type SearchScanner } from '../src/service/search/index.ts'
import type { SearchBaseAccess } from '../src/service/search/base-access.ts'
import { canMergeWindows, groupMatchesByFile } from '../src/service/search/file-summary.ts'
import type { SearchFileDetailResult, SearchOverviewResult, SearchResult } from '../src/model/types.ts'
import { KbError } from '../src/model/types.ts'

function createSearchBaseAccess(dataRoot: string): SearchBaseAccess {
  return {
    ensureBase: (baseId) => requireBase(dataRoot, baseId),
    markBaseUsed: (baseId) => markUsed(dataRoot, baseId),
  }
}

async function searchBase(
  dataRoot: string,
  input: SearchRequest,
  scanner?: SearchScanner,
): Promise<SearchResult> {
  return searchBaseWithAccess(dataRoot, input, createSearchBaseAccess(dataRoot), scanner)
}

test('命中展示使用实际命中行，而不是上下文第一行', () => {
  assert.equal(matchedExcerptLine({
    n: 1,
    path: 'README.md',
    startLine: 149,
    endLine: 165,
    matchLine: 157,
    excerpt: [
      '上下文第一行',
      '上下文第 2 行',
      '上下文第 3 行',
      '上下文第 4 行',
      '上下文第 5 行',
      '上下文第 6 行',
      '上下文第 7 行',
      '上下文第 8 行',
      '命中的 shadcn 行',
      '上下文第 10 行',
      '上下文第 11 行',
      '上下文第 12 行',
      '上下文第 13 行',
      '上下文第 14 行',
      '上下文第 15 行',
      '上下文第 16 行',
      '上下文最后一行',
    ].join('\n'),
  }), '命中的 shadcn 行')
})

test('命中展示优先使用格式模块给出的 matchedExcerpt', () => {
  assert.equal(matchedExcerptLine({
    n: 1,
    path: 'table.csv',
    startLine: 2,
    endLine: 3,
    matchLine: 3,
    excerpt: '名称: 甲公司 | 金额: 120\n名称: 乙公司 | 金额: 80',
    matchedExcerpt: '名称: 乙公司 | 金额: 80',
  }), '名称: 乙公司 | 金额: 80')
})

test('CSV 列名摘录拆成字段，表头行保持原文', () => {
  assert.deepEqual(parseLabeledFields('名称: 甲公司 | 金额: 120'), [
    { label: '名称', value: '甲公司' },
    { label: '金额', value: '120' },
  ])
  assert.equal(parseLabeledFields('列: 供应商 | 品类 | 金额'), null)
  assert.equal(parseLabeledFields('若乙方违约，甲方可解除合同'), null)
})

test('搜索关键词按空白拆开并去重', () => {
  assert.deepEqual(queryTerms('  违约  条款 违约 '), ['违约', '条款'])
  assert.deepEqual(queryTerms('   '), [])
})

test('文件归组按命中数降序、同数字典序，组内按行号升序', () => {
  const groups = groupMatchesByFile([
    { path: 'b.md', line: 5, columnByte: 1 },
    { path: 'a.md', line: 9, columnByte: 1 },
    { path: 'c.md', line: 3, columnByte: 1 },
    { path: 'a.md', line: 2, columnByte: 1 },
    { path: 'c.md', line: 8, columnByte: 1 },
  ])
  assert.deepEqual(groups.map((group) => group.path), ['a.md', 'c.md', 'b.md'])
  assert.deepEqual(groups[0]?.matches.map((match) => match.line), [2, 9])
})

test('命中窗口只在重叠或允许相邻时合并', () => {
  assert.equal(canMergeWindows({ startLine: 1, endLine: 5 }, { startLine: 6, endLine: 10 }, false), false)
  assert.equal(canMergeWindows({ startLine: 1, endLine: 5 }, { startLine: 6, endLine: 10 }, true), true)
  assert.equal(canMergeWindows({ startLine: 1, endLine: 5 }, { startLine: 5, endLine: 9 }, false), true)
})

test('空库搜索返回 overview 空结果，不携带 hits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-search-empty-'))
  try {
    const base = await createBase(root, { title: '工作库', description: '描述' })
    const result = asOverview(await searchBase(root, { baseId: base.id, query: '违约' }))
    assert.deepEqual(result.files, [])
    assert.equal(result.totalFiles, 0)
    assert.equal(result.totalHits, 0)
    assert.equal(result.page.hasMore, false)
    assert.equal(result.page.nextCursor, undefined)
    assert.equal('hits' in result, false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('输入校验拒绝缺字段、非法正则、别名和 limit', async () => {
  await assert.rejects(() => searchBase('/tmp', { baseId: '', query: '违约' }), KbError)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '  ' }), /query 必填/)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '(?=违约)' }), /不支持的正则语法/)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '违约', aliases: [''] }), /不能包含空正则/)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '违约', aliases: Array.from({ length: 9 }, (_, index) => `词${index}`) }), /不能超过 8 个/)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '违约', limit: 0 }), /limit 必须是/)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '违约', limit: 101 }), /limit 必须是/)
})

/** 建临时库并在 bases/<id>/ 下写文件，结束后清理。 */
async function withBase(
  prefix: string,
  files: Record<string, string>,
  work: (root: string, baseId: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), prefix))
  try {
    const base = await createBase(root, { title: '工作库', description: '描述' })
    for (const [relativePath, body] of Object.entries(files)) {
      const target = join(root, 'bases', base.id, ...relativePath.split('/'))
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, body)
    }
    await work(root, base.id)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

function asOverview(result: SearchResult): SearchOverviewResult {
  if (result.kind !== 'overview') throw new Error('应返回 overview')
  return result
}

function asFileDetail(result: SearchResult): SearchFileDetailResult {
  if (result.kind !== 'file-detail') throw new Error('应返回 file-detail')
  return result
}

async function searchAllOverviewPages(
  root: string,
  baseId: string,
  query: string,
  extra: { aliases?: string[]; category?: string; limit?: number } = {},
): Promise<SearchOverviewResult[]> {
  const pages: SearchOverviewResult[] = []
  let request: SearchRequest = { baseId, query, ...extra }
  for (let count = 0; count < 50; count += 1) {
    const page = asOverview(await searchBase(root, request))
    pages.push(page)
    if (!page.page.nextCursor) return pages
    request = { cursor: page.page.nextCursor, ...(extra.limit === undefined ? {} : { limit: extra.limit }) }
  }
  throw new Error('翻页超过 50 页，疑似死循环')
}

async function searchAllDetailPages(root: string, baseId: string, query: string, path: string, limit: number): Promise<SearchFileDetailResult[]> {
  const pages: SearchFileDetailResult[] = []
  let request: SearchRequest = { baseId, query, path, limit }
  for (let count = 0; count < 50; count += 1) {
    const page = asFileDetail(await searchBase(root, request))
    pages.push(page)
    if (!page.page.nextCursor) return pages
    request = { cursor: page.page.nextCursor, limit }
  }
  throw new Error('翻页超过 50 页，疑似死循环')
}

test('overview 返回文件摘要；path 使用知识库根目录相对 POSIX 路径', async () => {
  await withBase('zy-search-overview-', {
    '合同/2024/供应商合同.md': '若乙方违约则解约。\n',
    '会议/纪要.md': '周会无合同。\n',
  }, async (root, baseId) => {
    const result = asOverview(await searchBase(root, {
      baseId,
      query: '违约',
      aliases: ['解约'],
      category: '合同/2024',
    }))
    assert.deepEqual(result.query, { terms: ['违约', '解约'], aliases: ['解约'] })
    assert.equal(result.category, '合同/2024')
    assert.deepEqual(result.files, [{ path: '合同/2024/供应商合同.md', format: 'markdown', totalHits: 1 }])
    assert.equal(result.totalFiles, 1)
    assert.equal(result.totalHits, 1)
    assert.equal('hits' in result, false)

    const detail = asFileDetail(await searchBase(root, {
      baseId,
      query: '违约',
      aliases: ['解约'],
      category: '合同/2024',
      path: '合同/2024/供应商合同.md',
    }))
    assert.equal(detail.path, '合同/2024/供应商合同.md')
    assert.equal(detail.hits.length, 1)
    assert.equal(detail.hits[0]?.matchLine, 1)
    assert.ok(detail.hits[0]?.excerpt.includes('违约'))
  })
})

test('不存在的类目不会静默回退到知识库根目录', async () => {
  await withBase('zy-search-category-', { '会议/纪要.md': '违约金条款。\n' }, async (root, baseId) => {
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', category: '没有这个类目' }),
      (error: unknown) => error instanceof KbError && error.code === 'not_found',
    )
  })
})

test('overview 按文件分页，续页只使用自包含 cursor', async () => {
  await withBase('zy-search-pages-', {
    'b.md': '违约\n',
    'a.md': '违约\n违约\n',
    'c.md': '违约\n',
  }, async (root, baseId) => {
    const pages = await searchAllOverviewPages(root, baseId, '违约', { limit: 1 })
    assert.equal(pages.length, 3)
    assert.deepEqual(pages.flatMap((page) => page.files.map((file) => file.path)), ['a.md', 'b.md', 'c.md'])
    assert.deepEqual(pages.map((page) => page.totalHits), [4, 4, 4])
    assert.equal(pages[0]?.page.hasMore, true)
    assert.equal(pages[2]?.page.hasMore, false)
    assert.equal(pages[2]?.page.nextCursor, undefined)
    assert.ok(pages.every((page) => page.files.every((file) => !('hits' in file))))
  })
})

test('file-detail 锁定单文件并按命中分页，其他文件不参与结果', async () => {
  const lines = Array.from({ length: 40 }, (_, index) => [1, 20, 40].includes(index + 1) ? `违约明细${index + 1}` : '填充')
  await withBase('zy-search-detail-', {
    'aa/bb/cc.md': `${lines.join('\n')}\n`,
    'other.md': '违约但不应返回。\n',
  }, async (root, baseId) => {
    const pages = await searchAllDetailPages(root, baseId, '违约', 'aa/bb/cc.md', 1)
    assert.equal(pages.length, 3)
    assert.ok(pages.every((page) => page.path === 'aa/bb/cc.md'))
    assert.ok(pages.every((page) => page.totalHits === 3))
    assert.deepEqual(pages.flatMap((page) => page.hits.map((hit) => hit.n)), [1, 2, 3])
    assert.deepEqual(pages.flatMap((page) => page.hits.map((hit) => hit.matchLine)), [1, 20, 40])
    assert.equal(pages[0]?.page.hasMore, true)
    assert.equal(pages[2]?.page.hasMore, false)
    assert.equal('files' in pages[0]!, false)
  })
})

test('文件详情使用完整单文件扫描策略，概览保持默认上限', async () => {
  await withBase('zy-search-scan-policy-', { 'a.md': '违约。\n' }, async (root, baseId) => {
    const scanner: SearchScanner = {
      scan: async (input) => {
        if (input.targetPath) assert.equal(input.perFileMatchLimit, 'unlimited')
        else assert.equal(input.perFileMatchLimit, undefined)
        return {
          matches: [{ path: 'a.md', line: 1, columnByte: 1 }],
          warnings: [],
          complete: true,
        }
      },
    }
    const overview = asOverview(await searchBase(root, { baseId, query: '违约' }, scanner))
    assert.equal(overview.files[0]?.path, 'a.md')
    const detail = asFileDetail(await searchBase(root, { baseId, query: '违约', path: 'a.md' }, scanner))
    assert.equal(detail.totalHits, 1)
    assert.equal(detail.scan.complete, true)
  })
})

test('正则 OR、类目收窄和文件明细保持同一 path 语义', async () => {
  await withBase('zy-search-regex-', {
    '合同/2024/供应商合同.md': '若乙方违约，甲方可解约。\ntermination 条款见附件。\n',
    '会议/纪要.md': '会议中提到违约，但不在目标类目。\n',
  }, async (root, baseId) => {
    const overview = asOverview(await searchBase(root, {
      baseId,
      query: '违约',
      aliases: ['解约', 'termination'],
      category: '合同/2024',
    }))
    assert.equal(overview.files[0]?.path, '合同/2024/供应商合同.md')
    assert.equal(overview.files[0]?.totalHits, 2)
    const detail = asFileDetail(await searchBase(root, {
      baseId,
      query: '违约',
      aliases: ['解约', 'termination'],
      category: '合同/2024',
      path: '合同/2024/供应商合同.md',
    }))
    assert.equal(detail.totalHits, 2)
    assert.ok(detail.hits.some((hit) => hit.excerpt.includes('termination')))
    assert.ok(detail.hits.every((hit) => hit.matchLine >= hit.startLine && hit.matchLine <= hit.endLine))
  })
})

test('游标拒绝旧结构和跨 scope 请求，并可单独续页', async () => {
  await withBase('zy-search-cursor-', {
    'a.md': '违约\n',
    'b.md': '违约\n',
  }, async (root, baseId) => {
    const first = asOverview(await searchBase(root, { baseId, query: '违约', limit: 1 }))
    const cursor = first.page.nextCursor
    if (!cursor) throw new Error('缺少下一页游标')
    const second = asOverview(await searchBase(root, { cursor }))
    assert.equal(second.files.length, 1)
    assert.notEqual(second.files[0]?.path, first.files[0]?.path)

    const legacyCursor = Buffer.from(JSON.stringify({ version: 1, offset: 1, queryKey: 'x' }), 'utf8').toString('base64url')
    await assert.rejects(() => searchBase(root, { cursor: legacyCursor }), /搜索游标无效或已过期/)
    await assert.rejects(
      () => searchBase(root, { cursor, path: 'a.md' } as SearchRequest),
      /续页请求只能包含 cursor 和 limit/,
    )
    await assert.rejects(
      () => searchBase(root, { cursor, query: '解约' } as SearchRequest),
      /续页请求只能包含 cursor 和 limit/,
    )
  })
})

test('path 明细的文件不存在、越界和跨类目都会被拒绝', async () => {
  await withBase('zy-search-path-', {
    'a.md': '违约一处。\n',
    'empty.md': '没有相关内容。\n',
    '合同/2024/contract.md': '违约。\n',
  }, async (root, baseId) => {
    const empty = asFileDetail(await searchBase(root, { baseId, query: '违约', path: 'empty.md' }))
    assert.equal(empty.hits.length, 0)
    assert.equal(empty.totalHits, 0)
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', path: '没有这个文件.md' }),
      (error: unknown) => error instanceof KbError && error.code === 'not_found',
    )
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', path: '../outside.md' }),
      (error: unknown) => error instanceof KbError && error.code === 'path_escape',
    )
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', category: '合同/2024', path: 'a.md' }),
      (error: unknown) => error instanceof KbError && error.code === 'path_escape',
    )
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', path: '/etc/passwd' }),
      /POSIX 相对路径/,
    )
  })
})

test('扫描器不完整时返回 scan.stopReason，不能伪造可续页 cursor', async () => {
  await withBase('zy-search-scan-', { 'a.md': '违约。\n' }, async (root, baseId) => {
    const scanner: SearchScanner = {
      scan: async (input) => {
        assert.equal(input.rootDir, join(root, 'bases', baseId))
        return {
          matches: [{ path: 'a.md', line: 1, columnByte: 1 }],
          warnings: ['检索结果过多，已截断'],
          complete: false,
          stopReason: 'stdout-limit',
        }
      },
    }
    const result = asOverview(await searchBase(root, { baseId, query: '违约', limit: 1 }, scanner))
    assert.equal(result.scan.complete, false)
    assert.equal(result.scan.stopReason, 'stdout-limit')
    assert.deepEqual(result.scan.warnings, ['检索结果过多，已截断'])
    assert.equal(result.page.hasMore, false)
    assert.equal(result.page.nextCursor, undefined)
    const detail = asFileDetail(await searchBase(root, { baseId, query: '违约', path: 'a.md', limit: 1 }, scanner))
    assert.equal(detail.scan.complete, false)
    assert.equal(detail.scan.stopReason, 'stdout-limit')
    assert.deepEqual(detail.scan.warnings, ['检索结果过多，已截断'])
    assert.equal(detail.page.hasMore, false)
    assert.equal(detail.page.nextCursor, undefined)
  })
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseReadEntry, parseSearchResult, parseTableEditorPage } from '../src/client/host-payload.ts'

test('新版 Host preview payload 按原样通过', () => {
  const payload = {
    path: 'notes/a.md',
    kind: 'text' as const,
    text: '# 标题',
    format: 'markdown' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 1,
    truncation: 'none' as const,
    totalChars: 4,
    previewStatus: 'ready' as const,
  }
  assert.equal(parseReadEntry(payload), payload)
})

test('table preview 必须携带 record-aligned 表格数据', () => {
  const payload = {
    path: 'table.csv',
    kind: 'table' as const,
    text: '名称,金额\n甲,120',
    table: {
      headers: ['名称', '金额'],
      rows: [['甲', '120']],
      totalRows: 1,
      windowStartRow: 1,
      windowEndRow: 1,
      complete: true,
      revision: 'a'.repeat(64),
    },
    format: 'csv' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 2,
    truncation: 'none' as const,
    totalChars: 11,
    previewStatus: 'ready' as const,
  }
  assert.equal(parseReadEntry(payload), payload)
  const fallback = {
    path: 'table.csv',
    kind: 'text' as const,
    text: '名称,金额\n甲,120',
    format: 'csv' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 2,
    truncation: 'none' as const,
    totalChars: 11,
    previewStatus: 'fallback' as const,
  }
  assert.deepEqual(parseReadEntry({ ...payload, table: { ...payload.table, rows: [['甲', 120]] } }), fallback)
  assert.deepEqual(parseReadEntry({ ...payload, table: undefined }), fallback)
})

test('text preview 不得携带表格数据', () => {
  const payload = {
    path: 'notes/a.md',
    kind: 'text' as const,
    text: '# 标题',
    format: 'markdown' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 1,
    truncation: 'none' as const,
    totalChars: 4,
    previewStatus: 'ready' as const,
    table: { headers: ['名称'] },
  }
  assert.throws(() => parseReadEntry(payload), /预览数据无效/)
})

test('表格编辑分页要求安全的版本标识和字符串单元格', () => {
  const page = {
    headers: ['名称'],
    rows: [['甲']],
    totalRows: 1,
    windowStartRow: 1,
    windowEndRow: 1,
    complete: true,
    revision: 'a'.repeat(64),
  }
  assert.equal(parseTableEditorPage(page), page)
  assert.throws(() => parseTableEditorPage({ ...page, revision: 'stale' }), /分页数据无效/)
})

test('搜索 overview payload 严格保留分页、扫描和展示协议', () => {
  const payload = {
    kind: 'overview' as const,
    scope: 'files' as const,
    baseId: 'work',
    query: { terms: ['违约', '解约'], aliases: ['解约'] },
    files: [{ path: 'a.md', format: 'markdown' as const, totalHits: 1 }],
    totalFiles: 1,
    totalHits: 1,
    page: { scope: 'files' as const, returnedFiles: 1, hasMore: true, nextCursor: 'cursor' },
    scan: { complete: false, warnings: ['结果可能不完整'], stopReason: 'stdout-limit' as const },
    presentation: { template: 'search-overview-card' as const, version: 1 as const },
  }
  assert.deepEqual(parseSearchResult(payload), payload)
})

test('搜索 file-detail payload 接受单文件命中结果', () => {
  const payload = {
    kind: 'file-detail' as const,
    scope: 'hits' as const,
    baseId: 'work',
    category: '合同/2024',
    query: { terms: ['违约'], aliases: [] },
    path: '合同/2024/a.md',
    format: 'markdown' as const,
    totalHits: 1,
    hits: [{ n: 1, path: '合同/2024/a.md', startLine: 1, endLine: 1, matchLine: 1, excerpt: '正文' }],
    page: { scope: 'hits' as const, returnedHits: 1, hasMore: false },
    scan: { complete: true, warnings: [] },
    presentation: { template: 'search-file-detail-card' as const, version: 1 as const },
  }
  assert.deepEqual(parseSearchResult(payload), payload)
})

test('旧 flat 搜索 payload 和缺少新字段的 payload 都拒绝', () => {
  assert.throws(() => parseSearchResult({
    files: [],
    totalFiles: 0,
    totalHits: 0,
    warnings: [],
  }), /搜索结果无效/)
  assert.throws(() => parseSearchResult({
    kind: 'overview',
    scope: 'files',
    baseId: 'work',
    query: { terms: ['违约'], aliases: [] },
    files: [],
    totalFiles: 0,
    totalHits: 0,
    page: { scope: 'files', returnedFiles: 0, hasMore: false },
    scan: { complete: 'true', warnings: [] },
    presentation: { template: 'search-overview-card', version: 1 },
  }), /搜索结果无效/)
})

test('旧 Host 的 Markdown read 响应仍能打开预览', () => {
  const preview = parseReadEntry({ path: 'notes/a.md', text: '# 标题\n正文' }, {
    view: 'search-hit',
    matchLine: 2,
  })

  assert.deepEqual(preview, {
    path: 'notes/a.md',
    kind: 'text',
    text: '# 标题\n正文',
    format: 'markdown',
    view: 'search-hit',
    windowStartLine: 1,
    windowEndLine: 2,
    focusLine: 2,
    truncation: 'none',
    totalChars: 7,
    previewStatus: 'ready',
  })
})

test('不完整的 preview payload 不会被当成 Markdown 正文', () => {
  assert.throws(() => parseReadEntry({ path: 'notes/a.md' }), /预览数据无效/)
})

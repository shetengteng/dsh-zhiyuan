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

test('搜索结果协议保留分页和扫描完整性', () => {
  const payload = {
    files: [{
      path: 'a.md',
      format: 'markdown',
      totalHits: 1,
      hits: [{ n: 1, path: 'a.md', startLine: 1, endLine: 1, matchLine: 1, excerpt: '正文' }],
    }],
    totalFiles: 1,
    totalHits: 1,
    restFiles: [{ path: 'b.md', count: 3 }],
    warnings: ['结果可能不完整'],
    scanComplete: false,
    hasMore: true,
    nextCursor: 'cursor',
  }
  assert.deepEqual(parseSearchResult(payload), payload)
})

test('搜索结果缺少扫描字段时按完整且无下一页兼容', () => {
  const payload = { files: [], totalFiles: 0, totalHits: 0, warnings: [] }
  assert.deepEqual(parseSearchResult(payload), {
    files: [],
    totalFiles: 0,
    totalHits: 0,
    warnings: [],
    scanComplete: true,
    hasMore: false,
  })
})

test('搜索结果分页字段类型错误时拒绝', () => {
  assert.throws(() => parseSearchResult({
    files: [],
    totalFiles: 0,
    totalHits: 0,
    warnings: [],
    scanComplete: 'true',
    hasMore: false,
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

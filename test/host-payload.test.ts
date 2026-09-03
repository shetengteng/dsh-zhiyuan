import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCsvEditorPage, parseReadEntry } from '../src/client/host-payload.ts'

test('新版 Host preview payload 按原样通过', () => {
  const payload = {
    path: 'notes/a.md',
    text: '# 标题',
    format: 'markdown' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 1,
    truncation: 'none' as const,
    totalChars: 4,
    previewStatus: 'ready' as const,
    capabilities: { canEdit: true },
  }
  assert.equal(parseReadEntry(payload), payload)
})

test('CSV preview 必须携带 record-aligned 表格数据', () => {
  const payload = {
    path: 'table.csv',
    text: '名称,金额\n甲,120',
    format: 'csv' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 2,
    truncation: 'none' as const,
    totalChars: 11,
    previewStatus: 'ready' as const,
    capabilities: { canEdit: true },
    csv: {
      headers: ['名称', '金额'],
      rows: [['甲', '120']],
      totalRows: 1,
      windowStartRow: 1,
      windowEndRow: 1,
      complete: true,
      revision: 'a'.repeat(64),
    },
  }
  assert.equal(parseReadEntry(payload), payload)
  assert.throws(() => parseReadEntry({ ...payload, csv: { ...payload.csv, rows: [['甲', 120]] } }), /预览数据无效/)
})

test('CSV 编辑分页要求安全的版本标识和字符串单元格', () => {
  const page = {
    headers: ['名称'],
    rows: [['甲']],
    totalRows: 1,
    windowStartRow: 1,
    windowEndRow: 1,
    complete: true,
    revision: 'a'.repeat(64),
  }
  assert.equal(parseCsvEditorPage(page), page)
  assert.throws(() => parseCsvEditorPage({ ...page, revision: 'stale' }), /分页数据无效/)
})

test('旧 Host 的 Markdown read 响应仍能打开预览', () => {
  const preview = parseReadEntry({ path: 'notes/a.md', text: '# 标题\n正文' }, {
    view: 'search-hit',
    matchLine: 2,
  })

  assert.deepEqual(preview, {
    path: 'notes/a.md',
    text: '# 标题\n正文',
    format: 'markdown',
    view: 'search-hit',
    windowStartLine: 1,
    windowEndLine: 2,
    focusLine: 2,
    truncation: 'none',
    totalChars: 7,
    previewStatus: 'ready',
    capabilities: { canEdit: true },
  })
})

test('不完整的 preview payload 不会被当成 Markdown 正文', () => {
  assert.throws(() => parseReadEntry({ path: 'notes/a.md' }), /预览数据无效/)
})

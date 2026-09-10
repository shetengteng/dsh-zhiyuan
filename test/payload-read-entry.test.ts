import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseReadEntry } from '../src/view/payload/read-entry.ts'

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

test('不完整的 preview payload 不会被当成 Markdown 正文', () => {
  assert.throws(() => parseReadEntry({ path: 'notes/a.md' }), /预览数据无效/)
})

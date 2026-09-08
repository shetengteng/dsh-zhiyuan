import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTableEditorPage } from '../src/view/payload/table-page.ts'

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

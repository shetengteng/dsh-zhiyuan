import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EntryFormat, SourceFormat } from '../../src/model/content-contract.ts'
import { contentRegistry } from '../../src/formats/host-api.ts'

test('内容 registry 是导入、库内条目和搜索 glob 的唯一 M0 路由来源', () => {
  assert.deepEqual(contentRegistry.sourceExtensions(), ['.md', '.markdown', '.txt', '.csv', '.docx'])
  assert.deepEqual(contentRegistry.entryExtensions(), ['.md', '.txt', '.markdown', '.csv'])
  assert.deepEqual(contentRegistry.searchGlobs(), ['*.md', '*.txt', '*.markdown', '*.csv'])

  assert.equal(contentRegistry.sourceFormatForPath('notes/plan.MD'), SourceFormat.Markdown)
  assert.equal(contentRegistry.sourceFormatForPath('notes/plain.txt'), SourceFormat.PlainText)
  assert.equal(contentRegistry.sourceFormatForPath('data/table.CSV'), SourceFormat.Csv)
  assert.equal(contentRegistry.sourceFormatForPath('data/report.DOCX'), SourceFormat.Docx)
  assert.equal(contentRegistry.sourceFormatForPath('data/table.xlsx'), undefined)

  assert.equal(contentRegistry.entryFormatForPath('notes/plan.markdown'), EntryFormat.Markdown)
  assert.equal(contentRegistry.entryFormatForPath('data/table.csv'), EntryFormat.Csv)
  // DOCX 产物是 markdown 条目，.docx 本身不是库内可检索后缀
  assert.equal(contentRegistry.entryFormatForPath('data/report.docx'), undefined)
  assert.equal(contentRegistry.isStoredEntryPath('data/table.xlsx'), false)
})

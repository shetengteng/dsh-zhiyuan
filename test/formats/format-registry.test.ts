import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EntryFormat, SourceFormat } from '../../src/model/content-contract.ts'
import { contentRegistry } from '../../src/formats/host-api.ts'

test('内容 registry 是导入、库内条目和搜索 glob 的唯一路由来源', () => {
  assert.deepEqual(contentRegistry.sourceExtensions(), ['.md', '.markdown', '.txt', '.csv', '.docx', '.xlsx', '.pdf', '.html', '.htm'])
  assert.deepEqual(contentRegistry.entryExtensions(), ['.md', '.txt', '.markdown', '.csv'])
  assert.deepEqual(contentRegistry.searchGlobs(), ['*.md', '*.txt', '*.markdown', '*.csv'])

  assert.equal(contentRegistry.sourceFormatForPath('notes/plan.MD'), SourceFormat.Markdown)
  assert.equal(contentRegistry.sourceFormatForPath('notes/plain.txt'), SourceFormat.PlainText)
  assert.equal(contentRegistry.sourceFormatForPath('data/table.CSV'), SourceFormat.Csv)
  assert.equal(contentRegistry.sourceFormatForPath('data/report.DOCX'), SourceFormat.Docx)
  assert.equal(contentRegistry.sourceFormatForPath('data/table.XLSX'), SourceFormat.Xlsx)
  assert.equal(contentRegistry.sourceFormatForPath('data/paper.PDF'), SourceFormat.Pdf)
  assert.equal(contentRegistry.sourceFormatForPath('pages/demo.HTML'), SourceFormat.Html)
  assert.equal(contentRegistry.sourceFormatForPath('pages/demo.HTM'), SourceFormat.Html)

  assert.equal(contentRegistry.entryFormatForPath('notes/plan.markdown'), EntryFormat.Markdown)
  assert.equal(contentRegistry.entryFormatForPath('data/table.csv'), EntryFormat.Csv)
  // DOCX / XLSX / PDF 产物分别是 markdown / csv / markdown 条目，源后缀本身不是库内可检索后缀
  assert.equal(contentRegistry.entryFormatForPath('data/report.docx'), undefined)
  assert.equal(contentRegistry.entryFormatForPath('data/table.xlsx'), undefined)
  assert.equal(contentRegistry.entryFormatForPath('data/paper.pdf'), undefined)
  assert.equal(contentRegistry.isStoredEntryPath('data/table.xlsx'), false)
})

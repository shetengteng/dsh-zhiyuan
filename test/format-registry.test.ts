import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EntryFormat, SourceFormat } from '../src/content/api.ts'
import { contentRegistry } from '../src/content/host-api.ts'

test('内容 registry 是导入、库内条目和搜索 glob 的唯一 M0 路由来源', () => {
  assert.deepEqual(contentRegistry.sourceExtensions(), ['.md', '.markdown', '.txt', '.csv'])
  assert.deepEqual(contentRegistry.entryExtensions(), ['.md', '.txt', '.markdown', '.csv'])
  assert.deepEqual(contentRegistry.searchGlobs(), ['*.md', '*.txt', '*.markdown', '*.csv'])

  assert.equal(contentRegistry.sourceFormatForPath('notes/plan.MD'), SourceFormat.Markdown)
  assert.equal(contentRegistry.sourceFormatForPath('notes/plain.txt'), SourceFormat.PlainText)
  assert.equal(contentRegistry.sourceFormatForPath('data/table.CSV'), SourceFormat.Csv)
  assert.equal(contentRegistry.sourceFormatForPath('data/table.xlsx'), undefined)

  assert.equal(contentRegistry.entryFormatForPath('notes/plan.markdown'), EntryFormat.Markdown)
  assert.equal(contentRegistry.entryFormatForPath('data/table.csv'), EntryFormat.Csv)
  assert.equal(contentRegistry.isStoredEntryPath('data/table.xlsx'), false)
})

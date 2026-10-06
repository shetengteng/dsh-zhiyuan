import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractImportProgress, parseImportResponse } from '../../src/view/payload/import-result.ts'

test('extractImportProgress：导入任务带完整快照时原样返回', () => {
  const files = [{ relPath: 'a.md', sourceRelPath: 'a.md', status: 'copied' as const, writtenBytes: 3 }]
  const status = { running: true, op: 'import', failed: [], progress: { total: 2, processed: 1, current: 'b.md', files } }
  assert.deepEqual(extractImportProgress(status), { total: 2, processed: 1, current: 'b.md', files })
})

test('extractImportProgress：非导入任务、缺进度或字段残缺都返回 null', () => {
  const progress = { total: 1, processed: 0, files: [] }
  assert.equal(extractImportProgress({ running: true, op: 'search', failed: [], progress }), null)
  assert.equal(extractImportProgress({ running: true, op: 'import', failed: [] }), null)
  assert.equal(extractImportProgress({ running: true, op: 'import', failed: [], progress: { total: 1, files: [] } }), null)
  assert.equal(extractImportProgress({ running: true, op: 'import', failed: [], progress: { processed: 1, files: [] } }), null)
  assert.equal(extractImportProgress({ running: true, op: 'import', failed: [], progress: { total: 1, processed: 1 } }), null)
  assert.equal(extractImportProgress('broken'), null)
})

test('parseImportResponse：文件级失败字段齐全时通过', () => {
  const payload = {
    kbId: 'kb-1',
    copied: ['x/S.csv'],
    renamed: [],
    skipped: 1,
    failed: 1,
    createdDirs: ['x'],
    files: [
      { relPath: 'x/S.csv', sourceRelPath: '样张.xlsx', status: 'copied' as const, writtenBytes: 8 },
      { relPath: '样张.xlsx', sourceRelPath: '样张.xlsx', status: 'failed' as const, code: 'xlsx_invalid' as const, reason: '工作表「S」含有未保存计算结果的公式' },
    ],
    warnings: [],
  }
  assert.equal(parseImportResponse(payload), payload)
})

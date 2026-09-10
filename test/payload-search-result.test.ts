import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSearchResult } from '../src/view/payload/search-result.ts'

test('搜索 overview payload 严格保留分页、扫描和展示协议', () => {
  const payload = {
    kind: 'overview' as const,
    scope: 'files' as const,
    kbId: 'work',
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
    kbId: 'work',
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
    kbId: 'work',
    query: { terms: ['违约'], aliases: [] },
    files: [],
    totalFiles: 0,
    totalHits: 0,
    page: { scope: 'files', returnedFiles: 0, hasMore: false },
    scan: { complete: 'true', warnings: [] },
    presentation: { template: 'search-overview-card', version: 1 },
  }), /搜索结果无效/)
})

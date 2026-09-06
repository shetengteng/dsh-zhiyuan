import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SearchFileDetailPage, SearchFileDetailResult, SearchFileSummary, SearchHit, SearchOverviewPage, SearchOverviewResult } from '../src/types.ts'
import {
  appendSearchPage,
  appendSearchPageHistory,
  canSearchNextPage,
  canSearchPreviousPage,
  createSearchPageHistory,
  getSearchNextCursor,
  getSearchPage,
  SEARCH_PAGE_SIZE,
  selectSearchPage,
} from '../src/client/search/search-pages.ts'

const query = { terms: ['供应商'], aliases: [] }
const scan = { complete: true, warnings: [] }

function overview(files: SearchFileSummary[], page: SearchOverviewPage): SearchOverviewResult {
  return {
    kind: 'overview',
    scope: 'files',
    baseId: 'base-1',
    query,
    files,
    totalFiles: 3,
    totalHits: 4,
    page,
    scan,
    presentation: { template: 'search-overview-card', version: 1 },
  }
}

function hit(n: number): SearchHit {
  return { n, path: '供应商.md', startLine: n, endLine: n, matchLine: n, excerpt: `命中 ${n}` }
}

function detail(hits: SearchHit[], page: SearchFileDetailPage): SearchFileDetailResult {
  return {
    kind: 'file-detail',
    scope: 'hits',
    baseId: 'base-1',
    query,
    path: '供应商.md',
    format: 'markdown',
    totalHits: 2,
    hits,
    page,
    scan,
    presentation: { template: 'search-file-detail-card', version: 1 },
  }
}

test('搜索分页使用五条一页，并只在真实 cursor 存在时显示下一页', () => {
  assert.equal(SEARCH_PAGE_SIZE, 5)
  assert.equal(getSearchNextCursor(overview([], { scope: 'files', returnedFiles: 0, hasMore: false })), undefined)
  assert.equal(getSearchNextCursor(overview([], { scope: 'files', returnedFiles: 0, hasMore: true, nextCursor: '  next  ' })), 'next')
  assert.equal(getSearchNextCursor(overview([], { scope: 'files', returnedFiles: 0, hasMore: true })), undefined)
})

test('overview 续页追加文件并沿用 Host 的末页元数据', () => {
  const first = overview([
    { path: 'a.md', format: 'markdown', totalHits: 1 },
    { path: 'b.md', format: 'markdown', totalHits: 1 },
  ], { scope: 'files', returnedFiles: 2, hasMore: true, nextCursor: 'next' })
  const second = overview([
    { path: 'c.md', format: 'markdown', totalHits: 2 },
  ], { scope: 'files', returnedFiles: 1, hasMore: false })
  const merged = appendSearchPage(first, second)

  assert.deepEqual(merged.kind === 'overview' ? merged.files.map((file) => file.path) : [], ['a.md', 'b.md', 'c.md'])
  assert.equal(merged.page.returnedFiles, 3)
  assert.equal(merged.totalFiles, second.totalFiles)
  assert.equal(getSearchNextCursor(merged), undefined)
})

test('file-detail 续页追加命中，并拒绝不同文件的分页结果', () => {
  const first = detail([hit(1)], { scope: 'hits', returnedHits: 1, hasMore: true, nextCursor: 'next' })
  const second = detail([hit(2)], { scope: 'hits', returnedHits: 1, hasMore: false })
  const merged = appendSearchPage(first, second)

  assert.deepEqual(merged.kind === 'file-detail' ? merged.hits.map((item) => item.n) : [], [1, 2])
  assert.equal(merged.page.returnedHits, 2)
  assert.throws(() => appendSearchPage(first, { ...second, path: '其他.md' }), /搜索分页目标文件不一致/)
})

test('详情页历史支持缓存回退、缓存前进和 Host cursor 续页', () => {
  const first = detail([hit(1)], { scope: 'hits', returnedHits: 1, hasMore: true, nextCursor: 'second' })
  const second = detail([hit(2)], { scope: 'hits', returnedHits: 1, hasMore: true, nextCursor: 'third' })
  const third = detail([hit(3)], { scope: 'hits', returnedHits: 1, hasMore: false })

  let history = createSearchPageHistory(first)
  assert.equal(canSearchPreviousPage(history), false)
  assert.equal(canSearchNextPage(history), true)

  history = appendSearchPageHistory(history, second)
  assert.equal(history.currentIndex, 1)
  assert.equal(canSearchPreviousPage(history), true)
  assert.equal(canSearchNextPage(history), true)

  const firstPageHistory = selectSearchPage(history, 0)
  assert.equal(getSearchPage(firstPageHistory), first)
  assert.equal(canSearchPreviousPage(firstPageHistory), false)
  assert.equal(canSearchNextPage(firstPageHistory), true)

  const cachedSecondHistory = selectSearchPage(firstPageHistory, 1)
  assert.equal(getSearchPage(cachedSecondHistory), second)
  history = appendSearchPageHistory(cachedSecondHistory, third)
  assert.equal(getSearchPage(history), third)
  assert.equal(canSearchPreviousPage(history), true)
  assert.equal(canSearchNextPage(history), false)
})

test('详情页历史拒绝跨文件追加', () => {
  const first = detail([hit(1)], { scope: 'hits', returnedHits: 1, hasMore: true, nextCursor: 'next' })
  const otherFile = { ...detail([hit(2)], { scope: 'hits', returnedHits: 1, hasMore: false }), path: '其他.md' }

  assert.throws(() => appendSearchPageHistory(createSearchPageHistory(first), otherFile), /搜索分页目标文件不一致/)
})

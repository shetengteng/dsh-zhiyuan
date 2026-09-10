import type { SearchResult } from '../types.ts'

export const SEARCH_PAGE_SIZE = 5

export function getSearchNextCursor(result: SearchResult): string | undefined {
  if (!result.page.hasMore) return undefined
  const cursor = result.page.nextCursor?.trim()
  return cursor || undefined
}

export type SearchPageHistory = {
  pages: SearchResult[]
  currentIndex: number
}

export function createSearchPageHistory(page: SearchResult): SearchPageHistory {
  return { pages: [page], currentIndex: 0 }
}

export function getSearchPage(history: SearchPageHistory, index = history.currentIndex): SearchResult | undefined {
  return history.pages[index]
}

export function canSearchPreviousPage(history: SearchPageHistory | null): boolean {
  return Boolean(history && history.currentIndex > 0)
}

export function canSearchNextPage(history: SearchPageHistory | null): boolean {
  if (!history) return false
  const currentPage = getSearchPage(history)
  return history.currentIndex < history.pages.length - 1 || Boolean(currentPage && getSearchNextCursor(currentPage))
}

export function selectSearchPage(history: SearchPageHistory, index: number): SearchPageHistory {
  if (!Number.isSafeInteger(index) || index < 0 || index >= history.pages.length) throw new Error('搜索分页页码无效')
  return { ...history, currentIndex: index }
}

export function appendSearchPageHistory(history: SearchPageHistory, next: SearchResult): SearchPageHistory {
  const currentPage = getSearchPage(history)
  if (!currentPage) throw new Error('搜索分页当前页无效')
  assertSearchPageScope(currentPage, next)
  return {
    pages: [...history.pages.slice(0, history.currentIndex + 1), next],
    currentIndex: history.currentIndex + 1,
  }
}

function assertSearchPageScope(previous: SearchResult, next: SearchResult): void {
  if (previous.kind !== next.kind || previous.scope !== next.scope || previous.kbId !== next.kbId) {
    throw new Error('搜索分页作用域不一致')
  }
  if (previous.kind === 'file-detail' && next.kind === 'file-detail' && previous.path !== next.path) {
    throw new Error('搜索分页目标文件不一致')
  }
}

export function appendSearchPage(previous: SearchResult, next: SearchResult): SearchResult {
  assertSearchPageScope(previous, next)
  if (previous.kind === 'overview' && next.kind === 'overview') {
    return {
      ...next,
      files: [...previous.files, ...next.files],
      page: { ...next.page, returnedFiles: previous.files.length + next.files.length },
    }
  }
  if (previous.kind === 'file-detail' && next.kind === 'file-detail' && previous.path === next.path) {
    return {
      ...next,
      hits: [...previous.hits, ...next.hits],
      page: { ...next.page, returnedHits: previous.hits.length + next.hits.length },
    }
  }
  throw new Error('搜索分页目标文件不一致')
}

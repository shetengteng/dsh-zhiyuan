import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { SearchOverviewResult, SearchResult } from '../models.ts'
import { parseSearchResult } from '../host-payload.ts'
import {
  appendSearchPage,
  appendSearchPageHistory,
  createSearchPageHistory,
  getSearchNextCursor,
  getSearchPage,
  SEARCH_PAGE_SIZE,
  selectSearchPage,
  type SearchPageHistory,
} from '../search/search-pages.ts'

type SearchHostCall = (payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>

type SearchActionOptions = {
  baseId: string
  call: SearchHostCall
  searchResult: SearchResult | null
  searchOverviewResult: SearchOverviewResult | null
  searchDetailHistory: SearchPageHistory | null
  searchBusy: boolean
  searchRequestVersion: MutableRefObject<number>
  setQuery: Dispatch<SetStateAction<string>>
  setSearched: Dispatch<SetStateAction<boolean>>
  setSearchBusy: Dispatch<SetStateAction<boolean>>
  setSearchResult: Dispatch<SetStateAction<SearchResult | null>>
  setSearchOverviewResult: Dispatch<SetStateAction<SearchOverviewResult | null>>
  setSearchDetailHistory: Dispatch<SetStateAction<SearchPageHistory | null>>
  setSearchOpeningPath: Dispatch<SetStateAction<string>>
  setSearchError: Dispatch<SetStateAction<string>>
}

export type SearchActionHandlers = {
  onSearch: (nextQuery: string) => void
  onOpenFile: (entryPath: string) => void
  onBack: () => void
  onLoadMore: (cursor: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
}

export function createSearchActions(options: SearchActionOptions): SearchActionHandlers {
  const onSearch = (nextQuery: string): void => {
    const version = ++options.searchRequestVersion.current
    options.setQuery(nextQuery)
    options.setSearched(false)
    options.setSearchResult(null)
    options.setSearchOverviewResult(null)
    options.setSearchDetailHistory(null)
    options.setSearchOpeningPath('')
    options.setSearchBusy(true)
    options.setSearchError('')
    void options.call({ op: 'search', baseId: options.baseId, query: nextQuery, limit: SEARCH_PAGE_SIZE }).then((value) => {
      if (version !== options.searchRequestVersion.current) return
      const result = parseSearchResult(value)
      options.setSearchResult(result)
      if (result.kind === 'overview') options.setSearchOverviewResult(result)
      options.setSearchError(result.scan.warnings.join('；'))
      options.setSearched(true)
    }).catch((error: unknown) => {
      if (version !== options.searchRequestVersion.current) return
      options.setSearchResult(null)
      options.setSearchError(error instanceof Error ? error.message : String(error))
      options.setSearched(true)
    }).finally(() => {
      if (version === options.searchRequestVersion.current) options.setSearchBusy(false)
    })
  }

  const onOpenFile = (entryPath: string): void => {
    const overview = options.searchResult?.kind === 'overview' ? options.searchResult : options.searchOverviewResult
    if (!overview) return
    const version = ++options.searchRequestVersion.current
    options.setSearchOpeningPath(entryPath)
    options.setSearchDetailHistory(null)
    options.setSearchBusy(true)
    options.setSearchError('')
    void options.call({
      op: 'search',
      baseId: overview.baseId,
      query: overview.query.terms[0] ?? '',
      aliases: overview.query.aliases,
      ...(overview.category ? { category: overview.category } : {}),
      path: entryPath,
      limit: SEARCH_PAGE_SIZE,
    }).then((value) => {
      if (version !== options.searchRequestVersion.current) return
      const result = parseSearchResult(value)
      if (result.kind !== 'file-detail') throw new Error('Host 未返回文件详情')
      options.setSearchResult(result)
      options.setSearchDetailHistory(createSearchPageHistory(result))
      options.setSearchOpeningPath('')
      options.setSearchError(result.scan.warnings.join('；'))
    }).catch((error: unknown) => {
      if (version === options.searchRequestVersion.current) options.setSearchError(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (version === options.searchRequestVersion.current) options.setSearchBusy(false)
    })
  }

  const onBack = (): void => {
    options.searchRequestVersion.current += 1
    options.setSearchBusy(false)
    options.setSearchResult(options.searchOverviewResult)
    options.setSearchDetailHistory(null)
    options.setSearchOpeningPath('')
    options.setSearchError(options.searchOverviewResult?.scan.warnings.join('；') ?? '')
  }

  const onLoadMore = (cursor: string): void => {
    if (!options.searchResult || options.searchBusy) return
    const version = ++options.searchRequestVersion.current
    options.setSearchBusy(true)
    options.setSearchError('')
    void options.call({ op: 'search', cursor, limit: SEARCH_PAGE_SIZE }).then((value) => {
      if (version !== options.searchRequestVersion.current || !options.searchResult) return
      const next = parseSearchResult(value)
      const merged = appendSearchPage(options.searchResult, next)
      options.setSearchResult(merged)
      if (merged.kind === 'overview') options.setSearchOverviewResult(merged)
      options.setSearchError(next.scan.warnings.join('；'))
    }).catch((error: unknown) => {
      if (version === options.searchRequestVersion.current) options.setSearchError(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (version === options.searchRequestVersion.current) options.setSearchBusy(false)
    })
  }

  const onPreviousPage = (): void => {
    const history = options.searchDetailHistory
    if (options.searchBusy || !history || history.currentIndex === 0) return
    const previousHistory = selectSearchPage(history, history.currentIndex - 1)
    const previous = getSearchPage(previousHistory)
    if (!previous || previous.kind !== 'file-detail') return
    options.searchRequestVersion.current += 1
    options.setSearchDetailHistory(previousHistory)
    options.setSearchResult(previous)
    options.setSearchError(previous.scan.warnings.join('；'))
  }

  const onNextPage = (): void => {
    const currentResult = options.searchResult
    const history = options.searchDetailHistory
    if (options.searchBusy || !history || !currentResult || currentResult.kind !== 'file-detail') return
    const cachedIndex = history.currentIndex + 1
    if (cachedIndex < history.pages.length) {
      const nextHistory = selectSearchPage(history, cachedIndex)
      const next = getSearchPage(nextHistory)
      if (!next || next.kind !== 'file-detail') return
      options.setSearchDetailHistory(nextHistory)
      options.setSearchResult(next)
      options.setSearchError(next.scan.warnings.join('；'))
      return
    }
    const cursor = getSearchNextCursor(currentResult)
    if (!cursor) return
    const version = ++options.searchRequestVersion.current
    options.setSearchBusy(true)
    options.setSearchError('')
    void options.call({ op: 'search', cursor, limit: SEARCH_PAGE_SIZE }).then((value) => {
      if (version !== options.searchRequestVersion.current) return
      const next = parseSearchResult(value)
      if (next.kind !== 'file-detail') throw new Error('Host 未返回文件详情')
      options.setSearchDetailHistory(appendSearchPageHistory(history, next))
      options.setSearchResult(next)
      options.setSearchError(next.scan.warnings.join('；'))
    }).catch((error: unknown) => {
      if (version === options.searchRequestVersion.current) options.setSearchError(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (version === options.searchRequestVersion.current) options.setSearchBusy(false)
    })
  }

  return { onSearch, onOpenFile, onBack, onLoadMore, onPreviousPage, onNextPage }
}

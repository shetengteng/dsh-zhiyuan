import type { SearchPageInfo, SearchQuery, SearchScanInfo, SearchFileSummary } from './result-shared.ts'

export type SearchOverviewPage = Extract<SearchPageInfo, { scope: 'files' }>

export type SearchOverviewResult = {
  kind: 'overview'
  scope: 'files'
  baseId: string
  category?: string
  query: SearchQuery
  files: SearchFileSummary[]
  totalFiles: number
  totalHits: number
  page: SearchOverviewPage
  scan: SearchScanInfo
  presentation: {
    template: 'search-overview-card'
    version: 1
  }
}

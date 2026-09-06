import type { EntryFormat } from '../../content/api.ts'
import type { SearchHit, SearchPageInfo, SearchQuery, SearchScanInfo } from './result-shared.ts'

export type SearchFileDetailPage = Extract<SearchPageInfo, { scope: 'hits' }>

export type SearchFileDetailResult = {
  kind: 'file-detail'
  scope: 'hits'
  baseId: string
  category?: string
  query: SearchQuery
  path: string
  format: EntryFormat
  totalHits: number
  groupHeader?: string
  hits: SearchHit[]
  page: SearchFileDetailPage
  scan: SearchScanInfo
  presentation: {
    template: 'search-file-detail-card'
    version: 1
  }
}

export type { SearchFileDetailPage, SearchFileDetailResult } from './file-detail-result.ts'
export type { SearchOverviewPage, SearchOverviewResult } from './overview-result.ts'
export type { SearchFileSummary, SearchHit, SearchPageInfo, SearchQuery, SearchScanInfo, SearchScanStopReason } from './result-shared.ts'

import type { SearchFileDetailResult } from './file-detail-result.ts'
import type { SearchOverviewResult } from './overview-result.ts'

export type SearchResult = SearchOverviewResult | SearchFileDetailResult

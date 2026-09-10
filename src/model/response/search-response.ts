import type { EntryFormat } from '../content-contract.ts'

export type SearchHit = {
  n: number
  path: string
  startLine: number
  endLine: number
  matchLine: number
  excerpt: string
  /** 命中行展示文本；缺省时按物理行窗口从 excerpt 切片。 */
  matchedExcerpt?: string
  matchColumnByte?: number
  sourceFingerprint?: string
}

export type SearchQuery = {
  /** 已规范化、去重后的 ripgrep 正则表达式。 */
  terms: string[]
  aliases: string[]
}

export type SearchFileSummary = {
  path: string
  format: EntryFormat
  totalHits: number
}

export type SearchPageInfo =
  | {
      scope: 'files'
      returnedFiles: number
      hasMore: boolean
      nextCursor?: string
    }
  | {
      scope: 'hits'
      returnedHits: number
      hasMore: boolean
      nextCursor?: string
    }

export type SearchScanStopReason =
  | 'timeout'
  | 'stdout-limit'
  | 'per-file-match-limit'
  | 'file-size-limit'
  | 'io-error'

export type SearchScanInfo = {
  complete: boolean
  warnings: string[]
  stopReason?: SearchScanStopReason
}

export type SearchFileDetailPage = Extract<SearchPageInfo, { scope: 'hits' }>

export type SearchFileDetailResult = {
  kind: 'file-detail'
  scope: 'hits'
  kbId: string
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

export type SearchOverviewPage = Extract<SearchPageInfo, { scope: 'files' }>

export type SearchOverviewResult = {
  kind: 'overview'
  scope: 'files'
  kbId: string
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

export type SearchResult = SearchOverviewResult | SearchFileDetailResult

/** 检索用例对外返回的统一响应。 */
export type SearchResponse = SearchResult

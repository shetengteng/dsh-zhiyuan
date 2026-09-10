import type { SearchQuery } from '../response/search-response.ts'

/** 首次检索的应用请求。 */
export type InitialSearchRequest = {
  kbId: string
  query: string
  aliases?: string[]
  category?: string
  path?: string
  limit?: number
}

/** 基于 Host 返回游标继续检索的应用请求。 */
export type ContinueSearchRequest = {
  cursor: string
  limit?: number
}

export type SearchRequest = InitialSearchRequest | ContinueSearchRequest

/** 完成边界校验后的首次检索请求。 */
export type NormalizedInitialSearchRequest = {
  mode: 'initial'
  kbId: string
  query: SearchQuery
  category?: string
  path?: string
  limit: number
}

/** 完成边界校验后的续页检索请求。 */
export type NormalizedContinueSearchRequest = {
  mode: 'continue'
  cursor: string
  limit: number
}

export type NormalizedSearchRequest = NormalizedInitialSearchRequest | NormalizedContinueSearchRequest

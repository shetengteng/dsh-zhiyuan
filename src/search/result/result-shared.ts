import type { EntryFormat } from '../../content/api.ts'

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

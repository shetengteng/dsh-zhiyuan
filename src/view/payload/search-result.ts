import type {
  SearchFileDetailResult,
  SearchFileSummary,
  SearchHit,
  SearchOverviewResult,
  SearchQuery,
  SearchResult,
} from '../types.ts'
import { isEntryFormat } from '../../model/content-contract.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function parseSearchResult(value: unknown): SearchResult {
  const result = asRecord(value)
  if (!result || typeof result.kbId !== 'string' || !isSearchQuery(result.query) || !isSearchScan(result.scan)) {
    throw new Error('Host 返回的搜索结果无效')
  }
  if (result.kind === 'overview' && result.scope === 'files' && isSearchOverviewPage(result.page)
    && Array.isArray(result.files) && result.files.every(isSearchFileSummary)
    && isNonNegativeInteger(result.totalFiles) && isNonNegativeInteger(result.totalHits)
    && isPresentation(result.presentation, 'search-overview-card')) {
    if (result.category !== undefined && !isRelativePath(result.category)) throw new Error('Host 返回的搜索结果无效')
    return value as SearchOverviewResult
  }
  if (result.kind === 'file-detail' && result.scope === 'hits' && isRelativePath(result.path)
    && isEntryFormat(result.format) && isNonNegativeInteger(result.totalHits)
    && Array.isArray(result.hits) && result.hits.every(isSearchHit)
    && isSearchDetailPage(result.page) && isPresentation(result.presentation, 'search-file-detail-card')
    && (result.groupHeader === undefined || typeof result.groupHeader === 'string')) {
    if (result.category !== undefined && !isRelativePath(result.category)) throw new Error('Host 返回的搜索结果无效')
    return value as SearchFileDetailResult
  }
  throw new Error('Host 返回的搜索结果无效')
}

function isSearchQuery(value: unknown): value is SearchQuery {
  const query = asRecord(value)
  return Boolean(query && Array.isArray(query.terms) && query.terms.length > 0
    && query.terms.every((term) => typeof term === 'string' && Boolean(term.trim()))
    && Array.isArray(query.aliases) && query.aliases.every((alias) => typeof alias === 'string' && Boolean(alias.trim()))
    && query.terms.length === query.aliases.length + 1)
}

function isSearchScan(value: unknown): boolean {
  const scan = asRecord(value)
  const reasons = ['timeout', 'stdout-limit', 'per-file-match-limit', 'file-size-limit', 'io-error']
  return Boolean(scan && typeof scan.complete === 'boolean' && Array.isArray(scan.warnings)
    && scan.warnings.every((warning) => typeof warning === 'string')
    && (scan.stopReason === undefined || reasons.includes(String(scan.stopReason))))
}

function isSearchOverviewPage(value: unknown): boolean {
  const page = asRecord(value)
  return Boolean(page && page.scope === 'files' && isNonNegativeInteger(page.returnedFiles)
    && typeof page.hasMore === 'boolean' && validCursorField(page))
}

function isSearchDetailPage(value: unknown): boolean {
  const page = asRecord(value)
  return Boolean(page && page.scope === 'hits' && isNonNegativeInteger(page.returnedHits)
    && typeof page.hasMore === 'boolean' && validCursorField(page))
}

function validCursorField(page: Record<string, unknown>): boolean {
  if (page.hasMore) return typeof page.nextCursor === 'string' && Boolean(page.nextCursor.trim())
  return page.nextCursor === undefined
}

function isPresentation(value: unknown, template: string): boolean {
  const presentation = asRecord(value)
  return Boolean(presentation && presentation.template === template && presentation.version === 1)
}

function isSearchFileSummary(value: unknown): value is SearchFileSummary {
  const file = asRecord(value)
  return Boolean(file && isRelativePath(file.path) && isEntryFormat(file.format) && isNonNegativeInteger(file.totalHits))
}

function isRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\') || value.includes('//')) return false
  const segments = value.split('/')
  return segments.every((segment) => Boolean(segment) && segment !== '.' && segment !== '..')
}

function isSearchHit(value: unknown): value is SearchHit {
  const hit = asRecord(value)
  if (!hit) return false
  return isPositiveInteger(hit.n)
    && isRelativePath(hit.path)
    && isPositiveInteger(hit.startLine)
    && isPositiveInteger(hit.endLine)
    && hit.endLine >= hit.startLine
    && isPositiveInteger(hit.matchLine)
    && hit.matchLine >= hit.startLine
    && hit.matchLine <= hit.endLine
    && typeof hit.excerpt === 'string'
    && (hit.matchedExcerpt === undefined || typeof hit.matchedExcerpt === 'string')
    && (hit.matchColumnByte === undefined || isPositiveInteger(hit.matchColumnByte))
    && (hit.sourceFingerprint === undefined || typeof hit.sourceFingerprint === 'string')
}

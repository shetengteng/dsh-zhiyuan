import type { IngestResult, ReadEntryResult, SearchFileDetailResult, SearchFileSummary, SearchHit, SearchOverviewResult, SearchQuery, SearchResult } from './models.ts'
import type { TableEditorPage, TableWindowData } from '../content/api.ts'
import { isEntryContentKind, isEntryFormat, isEntryPreviewView } from '../content/api.ts'

export type LegacyPreviewContext = {
  view?: 'tree' | 'search-hit'
  matchLine?: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isTableWindowData(value: unknown): value is TableWindowData {
  const table = asRecord(value)
  if (!table) return false
  return Array.isArray(table.headers)
    && table.headers.every((header) => typeof header === 'string')
    && Array.isArray(table.rows) && table.rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))
    && isNonNegativeInteger(table.totalRows)
    && isNonNegativeInteger(table.windowStartRow)
    && isNonNegativeInteger(table.windowEndRow)
    && typeof table.complete === 'boolean'
    && (table.focusedRow === undefined || isPositiveInteger(table.focusedRow))
    && (table.revision === undefined || typeof table.revision === 'string' && /^[a-f0-9]{64}$/u.test(table.revision))
    && table.windowEndRow >= table.windowStartRow
    && table.windowEndRow <= table.totalRows
    && (table.focusedRow === undefined || table.focusedRow <= table.totalRows)
}

function isTableEditorPage(value: unknown): value is TableEditorPage {
  const page = asRecord(value)
  return isTableWindowData(page) && typeof page?.revision === 'string'
}

/** 按 kind 判别收窄预览正文：table 形态必须有合法表格数据，text 形态不得携带表格。 */
function isEntryContentBody(entry: Record<string, unknown>): boolean {
  if (entry.kind === 'table') return isTableWindowData(entry.table)
  if (entry.kind === 'text') return entry.table === undefined
  return false
}

export function parseReadEntry(value: unknown, legacyContext: LegacyPreviewContext = {}): ReadEntryResult {
  const entry = asRecord(value)
  const validFormat = isEntryFormat(entry?.format)
  const validView = isEntryPreviewView(entry?.view)
  const validKind = isEntryContentKind(entry?.kind)
  const validBody = isEntryContentBody(entry ?? {})
  const validTruncation = entry?.truncation === 'none'
    || entry?.truncation === 'before'
    || entry?.truncation === 'after'
    || entry?.truncation === 'both'
  const validStatus = entry?.previewStatus === 'ready'
    || entry?.previewStatus === 'stale'
    || entry?.previewStatus === 'fallback'
  if (entry && typeof entry.path === 'string' && typeof entry.text === 'string' && validFormat && validView
    && validKind && validBody
    && isPositiveInteger(entry.windowStartLine) && isPositiveInteger(entry.windowEndLine)
    && entry.windowEndLine >= entry.windowStartLine && validTruncation && typeof entry.totalChars === 'number'
    && Number.isFinite(entry.totalChars) && validStatus) {
    return value as ReadEntryResult
  }
  // CSV 表格结构不可用时只显示原始文本，避免错误交给 Markdown 渲染。
  if (entry?.format === 'csv') return parseCsvTextFallback(entry, legacyContext)
  // legacy 回退仅用于不带 kind 的旧 Markdown Host 响应；kind 存在但校验失败必须硬失败。
  if (entry?.kind !== undefined) throw new Error('Host 返回的预览数据无效')
  return parseLegacyMarkdownPreview(entry, legacyContext)
}

/** 收窄 loopback Host RPC 返回的表格编辑分页。 */
export function parseTableEditorPage(value: unknown): TableEditorPage {
  if (!isTableEditorPage(value)) throw new Error('Host 返回的表格分页数据无效')
  return value
}

function parseCsvTextFallback(entry: Record<string, unknown> | null, context: LegacyPreviewContext): ReadEntryResult {
  if (!entry || typeof entry.path !== 'string' || typeof entry.text !== 'string') {
    throw new Error('Host 返回的预览数据无效')
  }
  const lineCount = Math.max(1, entry.text.split(/\r?\n/).length)
  return {
    path: entry.path,
    kind: 'text',
    text: entry.text,
    format: 'csv',
    view: isEntryPreviewView(entry.view) ? entry.view : context.view ?? 'tree',
    windowStartLine: 1,
    windowEndLine: lineCount,
    truncation: 'none',
    totalChars: entry.text.length,
    previewStatus: 'fallback',
  }
}

function parseLegacyMarkdownPreview(entry: Record<string, unknown> | null, context: LegacyPreviewContext): ReadEntryResult {
  if (!entry || typeof entry.path !== 'string' || typeof entry.text !== 'string') {
    throw new Error('Host 返回的预览数据无效')
  }
  const lineCount = Math.max(1, entry.text.split(/\r?\n/).length)
  const matchLine = isPositiveInteger(context.matchLine) && context.matchLine <= lineCount
    ? context.matchLine
    : undefined
  return {
    path: entry.path,
    kind: 'text',
    text: entry.text,
    format: 'markdown',
    view: context.view ?? 'tree',
    windowStartLine: 1,
    windowEndLine: lineCount,
    ...(matchLine === undefined ? {} : { focusLine: matchLine }),
    truncation: 'none',
    totalChars: entry.text.length,
    previewStatus: 'ready',
  }
}

export function parseSearchResult(value: unknown): SearchResult {
  const result = asRecord(value)
  if (!result || typeof result.baseId !== 'string' || !isSearchQuery(result.query) || !isSearchScan(result.scan)) {
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

export function parseIngestResult(value: unknown): IngestResult {
  const result = asRecord(value)
  if (!result || typeof result.baseId !== 'string' || !Array.isArray(result.copied) || !Array.isArray(result.renamed)
    || typeof result.skipped !== 'number' || typeof result.failed !== 'number' || !Array.isArray(result.createdDirs)
    || !Array.isArray(result.files) || !Array.isArray(result.warnings)) {
    throw new Error('Host 返回的导入结果无效')
  }
  return value as IngestResult
}

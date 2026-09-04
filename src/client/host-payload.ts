import type { IngestResult, ReadEntryResult, SearchHit, SearchResult } from './models.ts'
import type { CsvEditorPage, CsvPreviewData } from '../content/api.ts'
import { isEntryFormat, isEntryPreviewView } from '../content/api.ts'

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

function isCsvPreviewData(value: unknown): value is CsvPreviewData {
  const csv = asRecord(value)
  return Boolean(csv)
    && Array.isArray(csv.headers) && csv.headers.every((header) => typeof header === 'string')
    && Array.isArray(csv.rows) && csv.rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))
    && isNonNegativeInteger(csv.totalRows)
    && isNonNegativeInteger(csv.windowStartRow)
    && isNonNegativeInteger(csv.windowEndRow)
    && typeof csv.complete === 'boolean'
    && (csv.focusedRow === undefined || isPositiveInteger(csv.focusedRow))
    && (csv.revision === undefined || typeof csv.revision === 'string' && /^[a-f0-9]{64}$/u.test(csv.revision))
    && csv.windowEndRow >= csv.windowStartRow
    && csv.windowEndRow <= csv.totalRows
    && (csv.focusedRow === undefined || csv.focusedRow <= csv.totalRows)
}

function isCsvEditorPage(value: unknown): value is CsvEditorPage {
  const page = asRecord(value)
  return isCsvPreviewData(page) && typeof page?.revision === 'string'
}

function isSearchHit(value: unknown): value is SearchHit {
  const hit = asRecord(value)
  return Boolean(hit)
    && isPositiveInteger(hit.n)
    && typeof hit.path === 'string'
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

export function parseReadEntry(value: unknown, legacyContext: LegacyPreviewContext = {}): ReadEntryResult {
  const entry = asRecord(value)
  const validFormat = isEntryFormat(entry?.format)
  const validView = isEntryPreviewView(entry?.view)
  const capabilities = asRecord(entry?.capabilities)
  const validCapabilities = typeof capabilities?.canEdit === 'boolean'
  const validCsv = entry?.format !== 'csv' || isCsvPreviewData(entry.csv)
  const validTruncation = entry?.truncation === 'none'
    || entry?.truncation === 'before'
    || entry?.truncation === 'after'
    || entry?.truncation === 'both'
  const validStatus = entry?.previewStatus === 'ready'
    || entry?.previewStatus === 'stale'
    || entry?.previewStatus === 'fallback'
  if (entry && typeof entry.path === 'string' && typeof entry.text === 'string' && validFormat && validView
    && isPositiveInteger(entry.windowStartLine) && isPositiveInteger(entry.windowEndLine)
    && entry.windowEndLine >= entry.windowStartLine && validTruncation && typeof entry.totalChars === 'number'
    && Number.isFinite(entry.totalChars) && validStatus && validCapabilities && validCsv) {
    return value as ReadEntryResult
  }
  if (entry?.format === 'csv') throw new Error('Host 返回的预览数据无效')
  return parseLegacyMarkdownPreview(entry, legacyContext)
}

/** 收窄 loopback Host RPC 返回的 CSV 编辑分页。 */
export function parseCsvEditorPage(value: unknown): CsvEditorPage {
  if (!isCsvEditorPage(value)) throw new Error('Host 返回的 CSV 分页数据无效')
  return value
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
    text: entry.text,
    format: 'markdown',
    view: context.view ?? 'tree',
    windowStartLine: 1,
    windowEndLine: lineCount,
    ...(matchLine === undefined ? {} : { focusLine: matchLine }),
    truncation: 'none',
    totalChars: entry.text.length,
    previewStatus: 'ready',
    capabilities: { canEdit: true },
  }
}

export function parseSearchResult(value: unknown): SearchResult {
  const result = asRecord(value)
  const hits = Array.isArray(result?.hits) ? result.hits.filter(isSearchHit) : []
  const warnings = Array.isArray(result?.warnings)
    ? result.warnings.filter((item): item is string => typeof item === 'string')
    : []
  if (!result || !Array.isArray(result.hits) || !Array.isArray(result.warnings) || hits.length !== result.hits.length) {
    throw new Error('Host 返回的搜索结果无效')
  }
  return { hits, warnings }
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

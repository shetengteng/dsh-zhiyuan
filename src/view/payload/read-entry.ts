import type { ReadEntryResult } from '../types.ts'
import type { TableWindowData } from '../../model/content-contract.ts'
import { isEntryContentKind, isEntryFormat, isEntryPreviewView } from '../../model/content-contract.ts'

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

export function isTableWindowData(value: unknown): value is TableWindowData {
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

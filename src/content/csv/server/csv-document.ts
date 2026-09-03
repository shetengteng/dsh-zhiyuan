import Papa from 'papaparse'
import { CSV_PREVIEW_MAX_CHARS, CSV_PREVIEW_MAX_ROWS, SEARCH_CONTEXT } from '../../../identity.ts'
import type { CsvEditorPage, CsvPreviewData, PreviewTruncation } from '../../api.ts'
import { KbError } from '../../../types.ts'

type CsvRecordRange = {
  startOffset: number
  endOffset: number
  startLine: number
  endLine: number
}

export type CsvDataRecord = CsvRecordRange & {
  cells: string[]
}

export type CsvDocument = {
  header: CsvRecordRange
  headers: string[]
  records: CsvDataRecord[]
}

export type CsvPreviewWindow = {
  csv: CsvPreviewData
  textStartOffset: number
  textEndOffset: number
  windowStartLine: number
  windowEndLine: number
  truncation: PreviewTruncation
}

const DELIMITER_CANDIDATES = [',', ';', '\t', '|'] as const

/** Parses CSV once on the Host, preserving logical-record source positions. */
export function parseCsvDocument(text: string): CsvDocument {
  const ranges = scanRecordRanges(text)
  const parsed = Papa.parse<string[]>(text, {
    delimiter: detectDelimiter(text),
    dynamicTyping: false,
    skipEmptyLines: false,
  })
  if (parsed.errors.length || parsed.data.length !== ranges.length) {
    throw new KbError('csv_parse_invalid', 'CSV 格式无效，无法安全解析')
  }
  const sourceRows = parsed.data.map((row) => row.map((cell) => String(cell)))
  trimTerminalEmptyRecord(text, sourceRows, ranges)
  const width = Math.max(1, ...sourceRows.map((row) => row.length))
  const headers = fillCells(sourceRows[0] ?? [], width)
  const header = ranges[0] ?? emptyRange()
  const records = sourceRows.slice(1).map((cells, index) => ({
    ...(ranges[index + 1] ?? emptyRange()),
    cells: fillCells(cells, width),
  }))
  return { header, headers, records }
}

/** Serializes parsed cells to the defined comma-delimited CSV form. */
export function serializeCsvDocument(document: CsvDocument): string {
  return Papa.unparse([document.headers, ...document.records.map((record) => record.cells)], { newline: '\n' })
}

/** Selects a bounded logical-record window for a read-only preview. */
export function createCsvPreviewWindow(
  document: CsvDocument,
  includeAllRows: boolean,
  focusLine?: number,
): CsvPreviewWindow {
  const focusedIndex = focusRecordIndex(document.records, focusLine)
  const selection = selectRecordRange(document.records, includeAllRows, focusedIndex)
  const firstRecord = selection.start === 0 ? document.header : document.records[selection.start] ?? document.header
  const lastRecord = selection.end >= selection.start
    ? document.records[selection.end] ?? document.header
    : document.header
  const totalRows = document.records.length
  const focusedRow = focusedIndex !== undefined && focusedIndex >= selection.start && focusedIndex <= selection.end
    ? focusedIndex + 1
    : undefined
  const hasRows = selection.end >= selection.start
  return {
    csv: {
      headers: document.headers,
      rows: hasRows ? document.records.slice(selection.start, selection.end + 1).map((record) => record.cells) : [],
      totalRows,
      windowStartRow: hasRows ? selection.start + 1 : 0,
      windowEndRow: hasRows ? selection.end + 1 : 0,
      complete: includeAllRows,
      ...(focusedRow === undefined ? {} : { focusedRow }),
    },
    textStartOffset: firstRecord.startOffset,
    textEndOffset: lastRecord.endOffset,
    windowStartLine: firstRecord.startLine,
    windowEndLine: lastRecord.endLine,
    truncation: truncationForRows(selection, totalRows),
  }
}

/** Selects a fixed-size record page for the CSV editor without copying the whole file to the Client. */
export function createCsvEditorPage(
  document: CsvDocument,
  requestedStartRow: number,
  requestedPageSize: number,
  revision: string,
): CsvEditorPage {
  const totalRows = document.records.length
  const pageSize = Math.max(1, requestedPageSize)
  const startIndex = totalRows ? Math.min(Math.max(0, requestedStartRow - 1), totalRows - 1) : 0
  const rows = document.records.slice(startIndex, startIndex + pageSize).map((record) => [...record.cells])
  const windowStartRow = rows.length ? startIndex + 1 : 0
  const windowEndRow = rows.length ? startIndex + rows.length : 0
  return {
    headers: [...document.headers],
    rows,
    totalRows,
    windowStartRow,
    windowEndRow,
    complete: windowEndRow === totalRows,
    revision,
  }
}

function scanRecordRanges(text: string): CsvRecordRange[] {
  const ranges: CsvRecordRange[] = []
  let startOffset = 0
  let startLine = 1
  let line = 1
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1
      else inQuotes = !inQuotes
      continue
    }
    const isLineFeed = char === '\n'
    const isStandaloneCarriageReturn = char === '\r' && text[index + 1] !== '\n'
    if (!isLineFeed && !isStandaloneCarriageReturn) continue
    if (!inQuotes) {
      ranges.push({ startOffset, endOffset: index + 1, startLine, endLine: line })
      startOffset = index + 1
      startLine = line + 1
    }
    line += 1
  }
  ranges.push({ startOffset, endOffset: text.length, startLine, endLine: line })
  return ranges
}

function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITER_CANDIDATES.map((delimiter) => [delimiter, 0]))
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1
      else inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && (char === '\n' || (char === '\r' && text[index + 1] !== '\n'))) break
    if (!inQuotes && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1)
  }
  return DELIMITER_CANDIDATES.reduce((best, delimiter) => (
    (counts.get(delimiter) ?? 0) > (counts.get(best) ?? 0) ? delimiter : best
  ), ',')
}

function fillCells(cells: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => cells[index] ?? '')
}

function trimTerminalEmptyRecord(text: string, rows: string[][], ranges: CsvRecordRange[]): void {
  const lastRange = ranges[ranges.length - 1]
  const lastRow = rows[rows.length - 1]
  if (!/\r?\n$|\r$/u.test(text) || !lastRange || !lastRow || lastRange.startOffset !== text.length) return
  if (!lastRow.every((cell) => cell === '')) return
  ranges.pop()
  rows.pop()
}

function emptyRange(): CsvRecordRange {
  return { startOffset: 0, endOffset: 0, startLine: 1, endLine: 1 }
}

function focusRecordIndex(records: CsvDataRecord[], focusLine: number | undefined): number | undefined {
  if (!focusLine || focusLine < 1) return undefined
  const index = records.findIndex((record) => record.startLine <= focusLine && focusLine <= record.endLine)
  return index < 0 ? undefined : index
}

function selectRecordRange(records: CsvDataRecord[], includeAllRows: boolean, focusedIndex: number | undefined): { start: number; end: number } {
  if (!records.length) return { start: 0, end: -1 }
  if (includeAllRows) return { start: 0, end: records.length - 1 }
  let start = focusedIndex === undefined ? 0 : Math.max(0, focusedIndex - SEARCH_CONTEXT)
  let end = focusedIndex === undefined ? records.length - 1 : Math.min(records.length - 1, focusedIndex + SEARCH_CONTEXT)
  while (start < end && (selectionLength(records, start, end) > CSV_PREVIEW_MAX_CHARS || end - start + 1 > CSV_PREVIEW_MAX_ROWS)) {
    if (focusedIndex === undefined || end - focusedIndex >= focusedIndex - start) end -= 1
    else start += 1
  }
  return { start, end }
}

function selectionLength(records: CsvDataRecord[], start: number, end: number): number {
  return records.slice(start, end + 1).reduce((total, record) => total + record.endOffset - record.startOffset, 0)
}

function truncationForRows(selection: { start: number; end: number }, totalRows: number): PreviewTruncation {
  const before = selection.start > 0
  const after = selection.end < totalRows - 1
  if (before && after) return 'both'
  if (before) return 'before'
  if (after) return 'after'
  return 'none'
}

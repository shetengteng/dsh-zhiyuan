import { parseCsvDocument, type CsvDataRecord, type CsvDocument } from './csv-document.ts'
import { createPhysicalLineSearchDocument, type SearchDocument, type SearchExcerpt } from '../../shared/search-document.ts'

const FIELD_NEWLINE = /[\r\n]+/g

function columnLabel(header: string, index: number): string {
  return header ? header : `列${index + 1}`
}

function formatHeaderLine(headers: string[]): string {
  return `列: ${headers.map((header, index) => columnLabel(header, index)).join(' | ')}`
}

function formatRecord(headers: string[], cells: string[]): string {
  const width = Math.max(headers.length, cells.length)
  return Array.from({ length: width }, (_, index) => {
    const label = columnLabel(headers[index] ?? '', index)
    const value = (cells[index] ?? '').replace(FIELD_NEWLINE, '↩')
    return `${label}: ${value}`
  }).join(' | ')
}

function isHeaderHit(document: CsvDocument, matchLine: number): boolean {
  if (matchLine >= document.header.startLine && matchLine <= document.header.endLine) {
    return !document.records.some((record) => record.startLine <= matchLine && matchLine <= record.endLine)
  }
  return document.records.length === 0
}

function windowRecords(records: CsvDataRecord[], focusIndex: number, radius: number): CsvDataRecord[] {
  const start = Math.max(0, focusIndex - radius)
  const end = Math.min(records.length - 1, focusIndex + radius)
  return records.slice(start, end + 1)
}

function headerExcerpt(document: CsvDocument, headerLine: string): SearchExcerpt {
  return {
    startLine: document.header.startLine,
    endLine: document.header.endLine,
    excerpt: headerLine,
    matchedExcerpt: headerLine,
  }
}

/** 把命中改写成「列名: 值」；表头命中只保留列名行。 */
export function csvColumnExcerpt(document: CsvDocument, matchLine: number, radius: number): SearchExcerpt {
  const headerLine = formatHeaderLine(document.headers)
  if (isHeaderHit(document, matchLine)) return headerExcerpt(document, headerLine)
  const focusIndex = document.records.findIndex((record) => record.startLine <= matchLine && matchLine <= record.endLine)
  const focus = document.records[focusIndex]
  if (focusIndex < 0 || !focus) return headerExcerpt(document, headerLine)
  const records = windowRecords(document.records, focusIndex, radius)
  if (!records.length) return headerExcerpt(document, headerLine)
  return {
    startLine: focus.startLine,
    endLine: focus.endLine,
    excerpt: [headerLine, ...records.map((record) => formatRecord(document.headers, record.cells))].join('\n'),
    matchedExcerpt: formatRecord(document.headers, focus.cells),
  }
}

function isCsvColumnExcerpt(excerpt: string): boolean {
  return excerpt.startsWith('列: ')
}

/** 合并相邻 CSV 列名 excerpt，避免按物理行错位拼接。 */
function mergeCsvColumnExcerpts(firstExcerpt: string, secondExcerpt: string): string {
  const firstLines = firstExcerpt.split(/\r?\n/)
  const secondLines = secondExcerpt.split(/\r?\n/)
  const header = isCsvColumnExcerpt(firstLines[0] ?? '') ? firstLines[0] : secondLines[0]
  const seen = new Set<string>()
  const rows: string[] = []
  for (const line of [...firstLines.slice(1), ...secondLines.slice(1)]) {
    if (!line || isCsvColumnExcerpt(line) || seen.has(line)) continue
    seen.add(line)
    rows.push(line)
  }
  return [header, ...rows].filter(Boolean).join('\n')
}

export function createCsvSearchDocument(bytes: Buffer, text: string): SearchDocument {
  const physical = createPhysicalLineSearchDocument(bytes, text)
  try {
    const document = parseCsvDocument(text)
    return {
      fingerprint: physical.fingerprint,
      normalizeColumnByte: physical.normalizeColumnByte,
      excerptAt: (matchLine, radius) => csvColumnExcerpt(document, matchLine, radius),
      mergeExcerpt: (first, second) => mergeCsvColumnExcerpts(first.excerpt, second.excerpt),
      mergeNeighbors: false,
    }
  } catch {
    return { ...physical, warnings: ['csv_parse_fallback：CSV 无法按列解析，已保留原文 excerpt'] }
  }
}

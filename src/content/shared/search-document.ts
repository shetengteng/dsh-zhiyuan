import { createHash } from 'node:crypto'
import { splitPhysicalLines } from './line-window.ts'

export type SearchExcerptSpan = {
  startLine: number
  endLine: number
  excerpt: string
}

export type SearchExcerpt = SearchExcerptSpan & {
  /** 命中行展示文本，由格式模块决定 */
  matchedExcerpt: string
}

export type SearchDocument = {
  fingerprint: string
  excerptAt: (matchLine: number, radius: number) => SearchExcerpt
  mergeExcerpt: (first: SearchExcerptSpan, second: SearchExcerptSpan, rangeStart: number, rangeEnd: number) => string
  normalizeColumnByte: (line: number, columnByte: number) => number | undefined
  /** 为 false 时只合并重叠区间，不把相邻记录收成一条 */
  mergeNeighbors?: boolean
  warnings?: string[]
}

/** 按物理行窗口拼接相邻 excerpt。 */
export function mergePhysicalExcerpts(
  first: SearchExcerptSpan,
  second: SearchExcerptSpan,
  rangeStart: number,
  rangeEnd: number,
): string {
  const firstLines = first.excerpt.split(/\r?\n/)
  const secondLines = second.excerpt.split(/\r?\n/)
  const mergedLines: string[] = []
  for (let line = rangeStart; line <= rangeEnd; line += 1) {
    if (line >= second.startLine && line <= second.endLine) {
      mergedLines.push(secondLines[line - second.startLine] ?? '')
    } else if (line >= first.startLine && line <= first.endLine) {
      mergedLines.push(firstLines[line - first.startLine] ?? '')
    } else {
      mergedLines.push('')
    }
  }
  return mergedLines.join('\n')
}

export function createPhysicalLineSearchDocument(bytes: Buffer, text: string): SearchDocument {
  const lines = splitPhysicalLines(text)
  const fingerprint = createHash('sha256').update(bytes).digest('hex')
  return {
    fingerprint,
    excerptAt: (matchLine, radius) => {
      const safeLine = Math.min(Math.max(matchLine, 1), Math.max(1, lines.length))
      const startLine = Math.max(1, safeLine - radius)
      const endLine = Math.min(lines.length, safeLine + radius)
      return {
        startLine,
        endLine,
        excerpt: lines.slice(startLine - 1, endLine).join('\n'),
        matchedExcerpt: lines[safeLine - 1] ?? '',
      }
    },
    mergeExcerpt: mergePhysicalExcerpts,
    normalizeColumnByte: (line, columnByte) => normalizeColumnByte(bytes, line, columnByte),
  }
}

function normalizeColumnByte(bytes: Buffer, line: number, columnByte: number): number | undefined {
  if (!Number.isInteger(columnByte) || columnByte < 1) return undefined
  const hasBom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
  if (line === 1 && hasBom && columnByte > 3) return columnByte - 3
  return columnByte
}

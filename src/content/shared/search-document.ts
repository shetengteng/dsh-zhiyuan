import { createHash } from 'node:crypto'
import { splitPhysicalLines } from './line-window.ts'

export type SearchExcerpt = {
  startLine: number
  endLine: number
  excerpt: string
}

export type SearchDocument = {
  fingerprint: string
  excerptAt: (matchLine: number, radius: number) => SearchExcerpt
  normalizeColumnByte: (line: number, columnByte: number) => number | undefined
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
      return { startLine, endLine, excerpt: lines.slice(startLine - 1, endLine).join('\n') }
    },
    normalizeColumnByte: (line, columnByte) => normalizeColumnByte(bytes, line, columnByte),
  }
}

function normalizeColumnByte(bytes: Buffer, line: number, columnByte: number): number | undefined {
  if (!Number.isInteger(columnByte) || columnByte < 1) return undefined
  const hasBom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
  if (line === 1 && hasBom && columnByte > 3) return columnByte - 3
  return columnByte
}

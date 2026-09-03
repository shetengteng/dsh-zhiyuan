import type { PreviewTruncation } from '../api.ts'

export type LineWindow = { start: number; end: number }

export function splitPhysicalLines(text: string): string[] {
  const lines: string[] = []
  let lineStart = 0
  for (let index = 0; index < text.length; index += 1) {
    const isLineFeed = text[index] === '\n'
    const isStandaloneCarriageReturn = text[index] === '\r' && text[index + 1] !== '\n'
    if (!isLineFeed && !isStandaloneCarriageReturn) continue
    const line = text.slice(lineStart, index)
    lines.push(isLineFeed && line.endsWith('\r') ? line.slice(0, -1) : line)
    lineStart = index + 1
  }
  if (lineStart < text.length || lines.length === 0) lines.push(text.slice(lineStart))
  return lines
}

function linePrefixLengths(lines: string[]): number[] {
  const prefixes = [0]
  for (const line of lines) prefixes.push(prefixes[prefixes.length - 1] + line.length)
  return prefixes
}

function serializedLength(prefixes: number[], start: number, end: number): number {
  if (end < start) return 0
  return prefixes[end] - prefixes[start - 1] + end - start
}

export function chooseLeadingWindow(lines: string[], maxChars: number): LineWindow {
  const prefixes = linePrefixLengths(lines)
  let end = 0
  while (end < lines.length) {
    const nextEnd = end + 1
    if (serializedLength(prefixes, 1, nextEnd) > maxChars && end > 0) break
    end = nextEnd
  }
  return { start: 1, end: Math.max(1, end) }
}

export function chooseFocusedWindow(lines: string[], requestedLine: number, radius: number, maxChars: number): LineWindow {
  const prefixes = linePrefixLengths(lines)
  const focusLine = Math.min(Math.max(requestedLine, 1), lines.length)
  let start = Math.max(1, focusLine - radius)
  let end = Math.min(lines.length, focusLine + radius)
  while (serializedLength(prefixes, start, end) > maxChars && (start < focusLine || end > focusLine)) {
    const before = focusLine - start
    const after = end - focusLine
    if (after >= before && end > focusLine) end -= 1
    else if (start < focusLine) start += 1
    else break
  }
  return { start, end }
}

export function truncationFor(window: LineWindow, lineCount: number): PreviewTruncation {
  const before = window.start > 1
  const after = window.end < lineCount
  if (before && after) return 'both'
  if (before) return 'before'
  if (after) return 'after'
  return 'none'
}

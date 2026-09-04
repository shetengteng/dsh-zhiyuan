import type { SearchHit } from './models.ts'

export function matchedExcerptLine(hit: SearchHit): string {
  if (hit.matchedExcerpt) return hit.matchedExcerpt
  const lines = hit.excerpt.split(/\r?\n/)
  const offset = hit.matchLine - hit.startLine
  if (Number.isInteger(offset) && offset >= 0 && offset < lines.length) return lines[offset] ?? ''
  return lines.find((line) => line.trim()) ?? ''
}

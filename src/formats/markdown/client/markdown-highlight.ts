export function hitSnippet(text: string, startLine?: number, endLine?: number): string {
  if (!startLine || startLine < 1) return ''
  const lines = text.split(/\r?\n/)
  const first = Math.min(startLine, lines.length)
  const lastLine = Math.min(endLine && endLine >= first ? endLine : first, lines.length)
  return lines.slice(first - 1, lastLine).join('\n').trim()
}

export function sourceLineOccurrence(sourceText: string, focusLine: number | undefined, needle: string): number {
  if (!focusLine || focusLine < 1) return 0
  const lines = sourceText.split(/\r?\n/)
  const before = lines.slice(0, Math.min(focusLine - 1, lines.length))
  return before.reduce((count, line) => count + countTextMatches(normalizeMarkdownLine(line), needle), 0)
}

export function normalizeMarkdownLine(value: string): string {
  return value
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?)/, '')
    .replace(/^\s*(?:[-+*]\s+|\d+[.)]\s+)/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function countTextMatches(text: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let offset = 0
  while (offset <= text.length) {
    const start = findTextMatch(text.slice(offset), needle)
    if (start === -1) return count
    count += 1
    offset += start + Math.max(1, needle.length)
  }
  return count
}

function findTextMatch(text: string, needle: string): number {
  return text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
}

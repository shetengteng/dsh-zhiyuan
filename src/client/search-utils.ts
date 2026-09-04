import type { SearchHit } from './models.ts'

export type LabeledField = {
  label: string
  value: string
}

export function matchedExcerptLine(hit: SearchHit): string {
  if (hit.matchedExcerpt) return hit.matchedExcerpt
  const lines = hit.excerpt.split(/\r?\n/)
  const offset = hit.matchLine - hit.startLine
  if (Number.isInteger(offset) && offset >= 0 && offset < lines.length) return lines[offset] ?? ''
  return lines.find((line) => line.trim()) ?? ''
}

/** 拆出搜索框里的关键词，去空白和重复，保留首次大小写。 */
export function queryTerms(query: string): string[] {
  const seen = new Set<string>()
  const terms: string[] = []
  for (const part of query.trim().split(/\s+/)) {
    if (!part) continue
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    terms.push(part)
  }
  return terms
}

/** 把「列名: 值 | 列名: 值」收成字段；对不上则返回 null，交给普通摘录。 */
export function parseLabeledFields(text: string): LabeledField[] | null {
  if (!text.includes(' | ')) return null
  const parts = text.split(' | ')
  if (parts.length < 2) return null
  const fields: LabeledField[] = []
  for (const part of parts) {
    const index = part.indexOf(': ')
    if (index <= 0) return null
    const label = part.slice(0, index).trim()
    if (!label) return null
    fields.push({ label, value: part.slice(index + 2) })
  }
  return fields
}

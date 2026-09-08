import type { ScannerMatch } from './scanner/scanner-contract.ts'
import type { SearchFileSummary } from '../../model/search-result.ts'
import { contentRegistry } from '../../content/host-api.ts'
import { EntryFormat } from '../../content/api.ts'

export type FileMatch = {
  line: number
  columnByte: number
}

export type FileMatchGroup = {
  path: string
  matches: FileMatch[]
}

/** 按文件归组：组间命中数降序、同数按路径字典序；组内按行号升序。 */
export function groupMatchesByFile(positions: ScannerMatch[]): FileMatchGroup[] {
  const byFile = new Map<string, FileMatch[]>()
  for (const position of positions) {
    const group = byFile.get(position.path)
    const match = { line: position.line, columnByte: position.columnByte }
    if (group) group.push(match)
    else byFile.set(position.path, [match])
  }
  const groups = [...byFile.entries()].map(([path, matches]) => ({ path, matches }))
  groups.sort((left, right) => right.matches.length - left.matches.length || left.path.localeCompare(right.path))
  for (const group of groups) group.matches.sort((left, right) => left.line - right.line || left.columnByte - right.columnByte)
  return groups
}

export function summarizeFileGroups(groups: FileMatchGroup[]): SearchFileSummary[] {
  return groups.flatMap((group) => {
    const format = contentRegistry.entryFormatForPath(group.path)
    if (!format) return []
    return [{ path: group.path, format, totalHits: group.matches.length }]
  })
}

export function formatForSearchPath(path: string): typeof EntryFormat[keyof typeof EntryFormat] {
  return contentRegistry.entryFormatForPath(path) ?? EntryFormat.Markdown
}

/** 两个命中窗口是否应合并为一条展示命中。 */
export function canMergeWindows(
  previous: { startLine: number; endLine: number },
  next: { startLine: number; endLine: number },
  allowNeighbors: boolean,
): boolean {
  return next.startLine <= previous.endLine + (allowNeighbors ? 1 : 0)
}

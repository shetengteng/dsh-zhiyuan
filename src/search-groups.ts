/** 检索结果按文件分组、确定性排序与分页位置的纯函数。不读文件、不产生副作用。 */

import type { RestFileCount } from './types.ts'

export type MatchPosition = {
  path: string
  line: number
  columnByte: number
}

export type FileMatchGroup = {
  path: string
  matches: Array<{ line: number; columnByte: number }>
}

/** 按文件归组：组间命中数降序、同数按路径字典序；组内按行号升序。 */
export function groupMatchesByFile(positions: MatchPosition[]): FileMatchGroup[] {
  const byFile = new Map<string, Array<{ line: number; columnByte: number }>>()
  for (const position of positions) {
    const group = byFile.get(position.path)
    if (group) group.push({ line: position.line, columnByte: position.columnByte })
    else byFile.set(position.path, [{ line: position.line, columnByte: position.columnByte }])
  }
  const groups: FileMatchGroup[] = [...byFile.entries()].map(([path, matches]) => ({ path, matches }))
  groups.sort((left, right) => right.matches.length - left.matches.length || left.path.localeCompare(right.path))
  for (const group of groups) {
    group.matches.sort((left, right) => left.line - right.line || left.columnByte - right.columnByte)
  }
  return groups
}

/** 两个命中窗口是否可合并：allowNeighbors 为 true 时相邻（差一行）也算，false 时只合并重叠。 */
export function canMergeWindows(
  previous: { startLine: number; endLine: number },
  next: { startLine: number; endLine: number },
  allowNeighbors: boolean,
): boolean {
  return next.startLine <= previous.endLine + (allowNeighbors ? 1 : 0)
}

/** 未展示文件清单：跳过本页已触碰的组，取前 limit 个。lastTouchedIndex 为 -1 表示本页没有组。 */
export function restFileList(groups: FileMatchGroup[], lastTouchedIndex: number, limit: number): RestFileCount[] {
  const firstUntouched = lastTouchedIndex < 0 ? 0 : lastTouchedIndex + 1
  return groups
    .slice(firstUntouched, firstUntouched + limit)
    .map((group) => ({ path: group.path, count: group.matches.length }))
}

/** 组前缀和：prefixRawCount[i] 是第 i 组之前所有组的原始命中数之和，用于全局编号 n。 */
export function prefixRawCounts(groups: FileMatchGroup[]): number[] {
  const prefix: number[] = new Array(groups.length)
  let total = 0
  for (let index = 0; index < groups.length; index += 1) {
    prefix[index] = total
    total += groups[index].matches.length
  }
  return prefix
}

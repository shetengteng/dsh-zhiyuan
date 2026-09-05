import type { SearchFileGroup, SearchResult } from './types.ts'

/** 渲染给 AI 的文本块：保持与 tools.ts 输出契约一致的轻量收窄。 */
type RenderedSearchResult = SearchResult | undefined

type TextBlock = { type: 'text'; text: string }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

function text(value: string): TextBlock[] {
  return [{ type: 'text' as const, text: value }]
}

export function renderIngestResult(value: unknown): TextBlock[] {
  const result = asRecord(value)
  const copied = Array.isArray(result?.copied) ? result.copied.filter((item): item is string => typeof item === 'string') : []
  const skipped = typeof result?.skipped === 'number' ? result.skipped : 0
  const failed = typeof result?.failed === 'number' ? result.failed : 0
  const files = Array.isArray(result?.files) ? result.files : []
  const failedFiles = files
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null && item.status === 'failed')
    .slice(0, 5)
    .map((item) => `${typeof item.sourceRelPath === 'string' ? item.sourceRelPath : String(item.relPath ?? '文件')}：${typeof item.reason === 'string' ? item.reason : '处理失败'}`)
  const summary = `导入 ${copied.length} · 跳过 ${skipped} · 失败 ${failed}`
  return text(failedFiles.length ? `${summary}\n${failedFiles.join('\n')}` : summary)
}

function isFileGroup(value: unknown): value is SearchFileGroup {
  const group = asRecord(value)
  if (!group) return false
  return typeof group.path === 'string'
    && Array.isArray(group.hits)
    && (group.groupHeader === undefined || typeof group.groupHeader === 'string')
}

function renderHit(hit: { n: number; path: string; startLine: number; endLine: number; matchLine: number; excerpt: string }): string {
  const lineRange = hit.startLine === hit.endLine ? `${hit.startLine}` : `${hit.startLine}–${hit.endLine}`
  return `\`${hit.n}\` ${hit.path}:${lineRange}（命中行 ${hit.matchLine}）\n${hit.excerpt}`
}

function renderGroup(group: SearchFileGroup): string {
  const countLabel = group.totalHits > group.hits.length ? `${group.hits.length}/${group.totalHits} 条` : `${group.hits.length} 条`
  const headerLines = [
    `${group.path}（${countLabel}）`,
    ...(group.groupHeader ? [group.groupHeader] : []),
  ]
  return `${headerLines.join('\n')}\n${group.hits.map(renderHit).join('\n')}`
}

/** kb_search 的 AI 文本渲染：概览 + 文件组 + 未展示清单 + 分页提示。 */
export function renderSearchResult(args: unknown, value: unknown): TextBlock[] {
  const result = asRecord(value) as RenderedSearchResult
  const files = Array.isArray(result?.files) ? result.files.filter(isFileGroup) : []
  const pageHitCount = files.reduce((sum, group) => sum + group.hits.length, 0)
  const warnings = asStringArray(result?.warnings)
  const scanComplete = result?.scanComplete !== false
  const hasMore = result?.hasMore === true
  const restFiles = Array.isArray(result?.restFiles)
    ? result.restFiles.filter((item): item is { path: string; count: number } => {
      const rest = asRecord(item)
      return rest ? typeof rest.path === 'string' && typeof rest.count === 'number' : false
    })
    : []
  const pathFilter = typeof asRecord(args)?.path === 'string' ? String(asRecord(args)?.path) : ''

  const bodyParts: string[] = []
  if (result && typeof result.totalFiles === 'number' && typeof result.totalHits === 'number' && result.totalHits > 0) {
    bodyParts.push(`【命中概览】${result.totalFiles} 个文件 · ${result.totalHits} 条命中 · 本页 ${pageHitCount} 条`)
  }
  bodyParts.push(...files.map(renderGroup))
  if (restFiles.length) {
    bodyParts.push(`【未展示】${restFiles.map((item) => `${item.path}（${item.count} 条）`).join('、')}`)
  }

  const body = bodyParts.length
    ? bodyParts.join('\n\n')
    : pathFilter
      ? `指定文件 ${pathFilter} 无命中`
      : scanComplete ? '无命中' : '当前扫描未完成，暂未找到可返回的命中'

  const notes: string[] = []
  if (hasMore) {
    notes.push(result?.nextCursor
      ? `当前仅展示本页内容，仍有更多命中；下一页游标：${result.nextCursor}`
      : '当前仅展示本页内容，仍有更多命中。')
  }
  if (!scanComplete) notes.push('本次扫描未完成，当前结果不能代表整个知识库。')
  if (result && typeof result.totalHits === 'number' && !scanComplete) notes.push('命中总数为下限。')
  if (warnings.length) notes.push(`提示：${warnings.join('；')}`)
  return text(notes.length ? `${body}\n\n${notes.join('\n')}` : body)
}

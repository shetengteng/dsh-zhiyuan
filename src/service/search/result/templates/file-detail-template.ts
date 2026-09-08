import type { SearchFileDetailResult } from '../../../../model/search-result.ts'

type TextBlock = { type: 'text'; text: string }

export function renderFileDetailResult(value: unknown): TextBlock[] {
  const result = asFileDetailResult(value)
  if (!result) return [{ type: 'text', text: '知识库检索结果无效' }]
  const hits = result.hits.map((hit) => {
    const lineRange = hit.startLine === hit.endLine ? `${hit.startLine}` : `${hit.startLine}–${hit.endLine}`
    return `\`${hit.n}\` ${hit.path}:${lineRange}（命中行 ${hit.matchLine}）\n${hit.excerpt}`
  }).join('\n')
  const countLabel = result.scan.complete ? `${result.totalHits} 条命中` : `至少 ${result.totalHits} 条命中`
  const body = result.hits.length
    ? `【文件详情】${result.path} · ${countLabel} · 本页 ${result.hits.length} 条\n${result.groupHeader ? `${result.groupHeader}\n` : ''}${hits}`
    : result.scan.complete ? `文件 ${result.path} 没有找到相关命中` : `文件 ${result.path} 的扫描未完成，暂未找到可返回的命中`
  const notes: string[] = []
  if (result.page.hasMore) notes.push('当前仅展示文件详情的一页，仍有更多命中。')
  if (!result.scan.complete) {
    notes.push('本次扫描未完成，命中数是当前已发现的下限。')
    if (result.scan.stopReason) notes.push(`停止原因：${result.scan.stopReason}`)
  }
  if (result.scan.warnings.length) notes.push(`提示：${result.scan.warnings.join('；')}`)
  return [{ type: 'text', text: notes.length ? `${body}\n\n${notes.join('\n')}` : body }]
}

function asFileDetailResult(value: unknown): SearchFileDetailResult | null {
  const result = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  return result?.kind === 'file-detail' && result.scope === 'hits' ? value as SearchFileDetailResult : null
}

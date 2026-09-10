import type { SearchFileDetailResult, SearchHit, SearchOverviewResult, SearchResult } from '../../model/response/search-response.ts'

type TextBlock = { type: 'text'; text: string }

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function asSearchResult(value: unknown): SearchResult | undefined {
  const result = asRecord(value)
  if (result?.kind === 'overview' && result.scope === 'files') return value as SearchOverviewResult
  if (result?.kind === 'file-detail' && result.scope === 'hits') return value as SearchFileDetailResult
  return undefined
}

function text(value: string): TextBlock[] {
  return [{ type: 'text', text: value }]
}

function renderHit(hit: SearchHit): string {
  const lineRange = hit.startLine === hit.endLine ? `${hit.startLine}` : `${hit.startLine}–${hit.endLine}`
  return `\`${hit.n}\` ${hit.path}:${lineRange}（命中行 ${hit.matchLine}）\n${hit.excerpt}`
}

function renderOverview(result: SearchOverviewResult): string {
  const files = result.files.map((file) => `${file.path}（${file.totalHits} 条）`)
  const body = files.length
    ? `【文件概览】${result.totalFiles} 个文件 · ${result.totalHits} 条命中 · 本页 ${files.length} 个文件\n${files.join('\n')}`
    : result.scan.complete ? '知识库中没有找到相关文件' : '当前扫描未完成，暂未找到可返回的文件'
  const notes: string[] = []
  if (result.page.hasMore) notes.push('当前仅展示文件概览的一页，仍有更多文件。')
  appendScanNotes(notes, result)
  return notes.length ? `${body}\n\n${notes.join('\n')}` : body
}

function renderDetail(result: SearchFileDetailResult): string {
  const hits = result.hits.map(renderHit).join('\n')
  const countLabel = result.scan.complete ? `${result.totalHits} 条命中` : `至少 ${result.totalHits} 条命中`
  const body = result.hits.length
    ? `【文件详情】${result.path} · ${countLabel} · 本页 ${result.hits.length} 条\n${result.groupHeader ? `${result.groupHeader}\n` : ''}${hits}`
    : result.scan.complete ? `文件 ${result.path} 没有找到相关命中` : `文件 ${result.path} 的扫描未完成，暂未找到可返回的命中`
  const notes: string[] = []
  if (result.page.hasMore) notes.push('当前仅展示文件详情的一页，仍有更多命中。')
  appendScanNotes(notes, result)
  return notes.length ? `${body}\n\n${notes.join('\n')}` : body
}

function appendScanNotes(notes: string[], result: SearchResult): void {
  if (result.scan.complete) {
    if (result.scan.warnings.length) notes.push(`提示：${result.scan.warnings.join('；')}`)
    return
  }
  notes.push('本次扫描未完成，当前结果不能代表整个知识库。')
  if (result.scan.stopReason) notes.push(`停止原因：${result.scan.stopReason}`)
  if (result.scan.warnings.length) notes.push(`提示：${result.scan.warnings.join('；')}`)
}

export function renderSearchResult(args: unknown, value: unknown): TextBlock[] {
  const result = asSearchResult(value)
  if (!result) return text('知识库检索结果无效')
  const pathFilter = typeof asRecord(args)?.path === 'string' ? String(asRecord(args)?.path) : ''
  if (result.kind === 'overview') return text(pathFilter && result.files.length === 0 ? `指定文件 ${pathFilter} 无命中` : renderOverview(result))
  return text(renderDetail(result))
}

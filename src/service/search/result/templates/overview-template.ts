import type { SearchOverviewResult } from '../../../../model/response/search-response.ts'

type TextBlock = { type: 'text'; text: string }

type JsonRecord = Record<string, unknown>

export function renderOverviewResult(value: unknown): TextBlock[] {
  const result = asOverviewResult(value)
  if (!result) return [{ type: 'text', text: '知识库检索结果无效' }]
  const pageLabel = result.files.length ? result.files.map((file) => `${file.path}（${file.totalHits} 条）`).join('\n') : ''
  const body = pageLabel
    ? `【文件概览】${result.totalFiles} 个文件 · ${result.totalHits} 条命中 · 本页 ${result.files.length} 个文件\n${pageLabel}`
    : result.scan.complete ? '知识库中没有找到相关文件' : '当前扫描未完成，暂未找到可返回的文件'
  const notes: string[] = []
  if (result.page.hasMore) notes.push('当前仅展示文件概览的一页，仍有更多文件。')
  if (result.page.hasMore && result.page.nextCursor) {
    notes.push(`下一页 cursor（请原样复制，只传 cursor 和可选 limit）：\`${result.page.nextCursor}\``)
  }
  if (!result.scan.complete) {
    notes.push('本次扫描未完成，文件数和命中数都是当前已发现的下限。')
    if (result.scan.stopReason) notes.push(`停止原因：${result.scan.stopReason}`)
  }
  if (result.scan.warnings.length) notes.push(`提示：${result.scan.warnings.join('；')}`)
  return [{ type: 'text', text: notes.length ? `${body}\n\n${notes.join('\n')}` : body }]
}

export function searchPresentationMeta(value: unknown): JsonRecord {
  const result = asRecord(value)
  if (!result || (result.kind !== 'overview' && result.kind !== 'file-detail')) return {}
  const keys = ['kind', 'scope', 'kbId', 'category', 'query', 'files', 'totalFiles', 'totalHits', 'page', 'scan', 'path', 'format', 'groupHeader', 'hits', 'presentation']
  const meta: JsonRecord = {}
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(result, key)) meta[key] = result[key]
  return meta
}

function asOverviewResult(value: unknown): SearchOverviewResult | null {
  const result = asRecord(value)
  return result?.kind === 'overview' && result.scope === 'files' ? value as SearchOverviewResult : null
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

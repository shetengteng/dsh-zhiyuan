import { renderFileDetailResult } from './file-detail-template.ts'
import { renderOverviewResult } from './overview-template.ts'

export { searchPresentationMeta } from './overview-template.ts'

export type SearchTextBlock = { type: 'text'; text: string }

export function renderSearchResult(_args: unknown, value: unknown): SearchTextBlock[] {
  const result = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  if (result?.kind === 'overview') return renderOverviewResult(value)
  if (result?.kind === 'file-detail') return renderFileDetailResult(value)
  return [{ type: 'text', text: '知识库检索结果无效' }]
}

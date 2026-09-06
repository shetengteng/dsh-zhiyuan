import { renderFileDetailResult } from './file-detail-template.ts'
import { renderOverviewResult } from './overview-template.ts'
import type { SearchResult } from '../index.ts'

export { searchPresentationMeta } from './overview-template.ts'

export type SearchTextBlock = { type: 'text'; text: string }

export function renderSearchResult(_args: unknown, value: unknown): SearchTextBlock[] {
  const result = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  if (result?.kind === 'overview') return renderOverviewResult(value)
  if (result?.kind === 'file-detail') return renderFileDetailResult(value)
  return [{ type: 'text', text: '知识库检索结果无效' }]
}

export function presentationMeta(value: SearchResult): Record<string, unknown> {
  return value.kind === 'overview'
    ? {
        kind: value.kind,
        scope: value.scope,
        baseId: value.baseId,
        ...(value.category ? { category: value.category } : {}),
        query: value.query,
        files: value.files,
        totalFiles: value.totalFiles,
        totalHits: value.totalHits,
        page: value.page,
        scan: value.scan,
        presentation: value.presentation,
      }
    : {
        kind: value.kind,
        scope: value.scope,
        baseId: value.baseId,
        ...(value.category ? { category: value.category } : {}),
        query: value.query,
        path: value.path,
        format: value.format,
        totalHits: value.totalHits,
        ...(value.groupHeader ? { groupHeader: value.groupHeader } : {}),
        hits: value.hits,
        page: value.page,
        scan: value.scan,
        presentation: value.presentation,
      }
}

import type { SearchFileDetailResult } from '../types.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import type { PreviewController } from '../toolview/preview/preview-state.ts'
import { isSamePreviewHit, usePreviewSelection } from '../toolview/preview/preview-state.ts'
import { SearchHitCard } from './SearchHitCard.tsx'
import { SearchPagination, type SearchPaginationProps } from './SearchPagination.tsx'
import { getSearchNextCursor } from './search-pages.ts'

export type SearchFileDetailCardProps = {
  result: SearchFileDetailResult
  preview: PreviewController
  onBack?: () => void
  pagination: SearchPaginationProps
  error?: string
}

export function SearchFileDetailCard(props: SearchFileDetailCardProps) {
  ensureSettingsStyles()
  const selectedHit = usePreviewSelection(props.preview)
  const { result } = props
  const nextCursor = getSearchNextCursor(result)
  const pageHint = nextCursor ? ' · 还有下一页' : result.scan.complete ? ' · 已全部展示' : ''
  const totalLabel = result.scan.complete ? `${result.totalHits} 条命中` : `至少 ${result.totalHits} 条命中`
  return (
    <section className="zy-search-card" aria-label="知识库文件详情">
      <div className="zy-search-detail-head">
        {props.onBack ? <button className="zy-btn zy-search-back" type="button" onClick={props.onBack}>返回文件概览</button> : null}
        <div className="zy-search-detail-copy">
          <code className="zy-search-file-path" title={result.path}>{result.path}</code>
          <span className="zy-search-file-meta">{result.format} · {totalLabel} · 本页 {result.hits.length} 条{pageHint}</span>
        </div>
      </div>
      {props.error ? <div className="zy-search-error" role="alert">{props.error}</div> : null}
      {result.groupHeader ? <div className="zy-search-file-header">{result.groupHeader}</div> : null}
      {result.hits.length ? (
        <div className="zy-search-hits">
          {result.hits.map((hit) => (
            <SearchHitCard
              key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`}
              hit={hit}
              selected={isSamePreviewHit(selectedHit, hit)}
              onOpenHit={(nextHit, trigger) => props.preview.select({ kbId: result.kbId, hit: nextHit }, trigger)}
            />
          ))}
        </div>
      ) : (
        <div className="zy-search-empty">{result.scan.complete ? '这个文件没有找到相关命中。' : '扫描尚未完成，当前没有可展示的命中。'}</div>
      )}
      {result.scan.complete ? null : <div className="zy-search-coverage">本次扫描未完成，命中数只能视为当前已发现结果的下限。</div>}
      {result.scan.warnings.length ? <div className="zy-search-coverage">{result.scan.warnings.join('；')}</div> : null}
      <SearchPagination {...props.pagination} />
    </section>
  )
}

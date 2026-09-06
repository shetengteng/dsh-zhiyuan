import type { SearchOverviewResult } from '../models.ts'

export type SearchOverviewCardProps = {
  result: SearchOverviewResult
  openingPath?: string
  openingError?: string
  onOpenFile: (entryPath: string) => void
  onLoadMore: (cursor: string) => void
  loadingMore?: boolean
}

export function SearchOverviewCard(props: SearchOverviewCardProps) {
  const { result } = props
  const totalLabel = result.scan.complete ? `${result.totalFiles} 个文件 · ${result.totalHits} 条命中` : `至少 ${result.totalFiles} 个文件 · 至少 ${result.totalHits} 条命中`
  const empty = result.files.length === 0
  return (
    <section className="zy-search-card" aria-label="知识库文件概览">
      <div className="zy-search-overview">
        {totalLabel} · 本页 {result.files.length} 个文件
      </div>
      {props.openingError ? <div className="zy-search-error" role="alert">{props.openingError}</div> : null}
      {empty ? (
        <div className="zy-search-empty">
          {result.scan.complete ? '没有找到相关文件。' : '扫描尚未完成，当前没有可展示的文件。'}
        </div>
      ) : (
        <div className="zy-search-files">
          {result.files.map((file) => {
            const opening = props.openingPath === file.path && !props.openingError
            return (
              <div key={file.path} className="zy-search-file-row">
                <div className="zy-search-file-copy">
                  <code className="zy-search-file-path" title={file.path}>{file.path}</code>
                  <span className="zy-search-file-meta">{file.format} · {file.totalHits} 条命中</span>
                </div>
                <button
                  className="zy-btn zy-search-file-open"
                  type="button"
                  disabled={opening}
                  onClick={() => props.onOpenFile(file.path)}
                >
                  {opening ? '加载中…' : props.openingPath === file.path ? '重试' : '查看详情'}
                </button>
              </div>
            )
          })}
        </div>
      )}
      {result.scan.complete ? null : <div className="zy-search-coverage">本次扫描未完成，计数和文件排序只能视为当前已发现结果的下限。</div>}
      {result.scan.warnings.length ? <div className="zy-search-coverage">{result.scan.warnings.join('；')}</div> : null}
      {result.page.hasMore && result.page.nextCursor ? (
        <button className="zy-btn zy-search-more" type="button" disabled={props.loadingMore} onClick={() => props.onLoadMore(result.page.nextCursor ?? '')}>
          {props.loadingMore ? '加载中…' : '加载更多文件'}
        </button>
      ) : null}
    </section>
  )
}

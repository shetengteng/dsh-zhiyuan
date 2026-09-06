import type { ReactNode } from 'react'
import type { SearchHit, SearchResult } from '../models.ts'
import { SearchHitCard } from '../search/SearchHitCard.tsx'
import { SearchPagination } from '../search/SearchPagination.tsx'
import { getSearchNextCursor } from '../search/search-pages.ts'
import { Note } from './Dialogs.tsx'
import { SearchIcon } from './Icons.tsx'
import { WorkbenchModal } from './WorkbenchModal.tsx'

export type SearchDialogProps = {
  baseTitle: string
  query: string
  result: SearchResult | null
  warning: string
  busy: boolean
  searched: boolean
  openingPath?: string
  onClose: () => void
  onSearch: (query: string) => void
  onLoadMore: (cursor: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
  canPreviousPage: boolean
  canNextPage: boolean
  onOpenFile: (entryPath: string) => void
  onBack: () => void
  onOpenHit: (hit: SearchHit) => void
}

export function SearchDialog(props: SearchDialogProps) {
  return (
    <WorkbenchModal open onClose={props.onClose} title={`搜索 ${props.baseTitle}`} className="zy-modal-search">
      <form
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          event.preventDefault()
          props.onSearch(String(new FormData(event.currentTarget).get('query') ?? ''))
        }}
      >
        <div className="zy-search-bar">
          <input className="zy-box" name="query" placeholder="正则表达式" defaultValue={props.query} autoFocus />
          <button className="zy-icon" type="submit" aria-label="搜索" disabled={props.busy}>
            <SearchIcon />
          </button>
        </div>
      </form>
      <Note text={props.warning} />
      <SearchResults
        result={props.result}
        busy={props.busy}
        searched={props.searched}
        openingPath={props.openingPath}
        onLoadMore={props.onLoadMore}
        onPreviousPage={props.onPreviousPage}
        onNextPage={props.onNextPage}
        canPreviousPage={props.canPreviousPage}
        canNextPage={props.canNextPage}
        onOpenFile={props.onOpenFile}
        onBack={props.onBack}
        onOpenHit={props.onOpenHit}
      />
    </WorkbenchModal>
  )
}

function SearchResults(props: {
  result: SearchResult | null
  busy: boolean
  searched: boolean
  openingPath?: string
  onLoadMore: (cursor: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
  canPreviousPage: boolean
  canNextPage: boolean
  onOpenFile: (entryPath: string) => void
  onBack: () => void
  onOpenHit: (hit: SearchHit) => void
}) {
  if (!props.result && props.busy) return <p className="zy-search-status">检索中…</p>
  if (!props.result && !props.searched) return <p className="zy-search-empty">输入正则表达式后回车，在这个知识库里查找文件。</p>
  if (!props.result) return <p className="zy-search-empty">没有可展示的检索结果。</p>
  if (props.result.kind === 'overview') return <OverviewResults {...props} result={props.result} />
  return <DetailResults {...props} result={props.result} />
}

function OverviewResults(props: {
  result: Extract<SearchResult, { kind: 'overview' }>
  busy: boolean
  openingPath?: string
  onLoadMore: (cursor: string) => void
  onOpenFile: (entryPath: string) => void
}) {
  const { result } = props
  const nextCursor = getSearchNextCursor(result)
  const pageHint = nextCursor ? ' · 还有下一页' : result.scan.complete ? ' · 已全部展示' : ''
  const totalLabel = result.scan.complete ? `${result.totalFiles} 个文件 · ${result.totalHits} 条命中` : `至少 ${result.totalFiles} 个文件 · 至少 ${result.totalHits} 条命中`
  return (
    <div className="zy-search-body">
      <p className="zy-search-status">{totalLabel} · 本页 {result.files.length} 个文件{pageHint}</p>
      {result.files.length ? (
        <div className="zy-search-files">
          {result.files.map((file) => (
            <div key={file.path} className="zy-search-file-row">
              <div className="zy-search-file-copy">
                <code className="zy-search-file-path" title={file.path}>{file.path}</code>
                <span className="zy-search-file-meta">{file.format} · {file.totalHits} 条命中</span>
              </div>
              <button
                className="zy-btn zy-search-file-open"
                type="button"
                disabled={props.busy && props.openingPath === file.path}
                onClick={() => props.onOpenFile(file.path)}
              >
                {props.busy && props.openingPath === file.path ? '加载中…' : '查看详情'}
              </button>
            </div>
          ))}
        </div>
      ) : <p className="zy-search-empty">{result.scan.complete ? '没有找到相关文件。' : '扫描尚未完成，当前没有可展示的文件。'}</p>}
      <SearchScanNote complete={result.scan.complete} warnings={result.scan.warnings} />
      {nextCursor ? (
        <button className="zy-btn zy-search-more" type="button" disabled={props.busy} onClick={() => props.onLoadMore(nextCursor)}>
          {props.busy ? '加载中…' : '加载更多文件'}
        </button>
      ) : null}
    </div>
  )
}

function DetailResults(props: {
  result: Extract<SearchResult, { kind: 'file-detail' }>
  busy: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  canPreviousPage: boolean
  canNextPage: boolean
  onBack: () => void
  onOpenHit: (hit: SearchHit) => void
}) {
  const { result } = props
  const nextCursor = getSearchNextCursor(result)
  const pageHint = nextCursor ? ' · 还有下一页' : result.scan.complete ? ' · 已全部展示' : ''
  const totalLabel = result.scan.complete ? `${result.totalHits} 条命中` : `至少 ${result.totalHits} 条命中`
  return (
    <div className="zy-search-body">
      <div className="zy-search-detail-head">
        <button className="zy-btn zy-search-back" type="button" onClick={props.onBack}>返回文件概览</button>
        <div className="zy-search-detail-copy">
          <code className="zy-search-file-path" title={result.path}>{result.path}</code>
          <span className="zy-search-file-meta">{result.format} · {totalLabel} · 本页 {result.hits.length} 条{pageHint}</span>
        </div>
      </div>
      {result.groupHeader ? <div className="zy-search-file-header">{result.groupHeader}</div> : null}
      {result.hits.length ? (
        <div className="zy-search-hits">
          {result.hits.map((hit) => (
            <SearchHitCard key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`} hit={hit} onOpenHit={(nextHit) => props.onOpenHit(nextHit)} />
          ))}
        </div>
      ) : <p className="zy-search-empty">{result.scan.complete ? '这个文件没有找到相关命中。' : '扫描尚未完成，当前没有可展示的命中。'}</p>}
      <SearchScanNote complete={result.scan.complete} warnings={result.scan.warnings} />
      <SearchPagination
        canPreviousPage={props.canPreviousPage}
        canNextPage={props.canNextPage}
        loading={props.busy}
        onPreviousPage={props.onPreviousPage}
        onNextPage={props.onNextPage}
      />
    </div>
  )
}

function SearchScanNote(props: { complete: boolean; warnings: string[] }): ReactNode {
  if (props.complete && !props.warnings.length) return null
  return (
    <div className="zy-search-coverage">
      {props.complete ? '' : '本次扫描未完成，计数是当前已发现结果的下限。'}
      {props.warnings.length ? ` ${props.warnings.join('；')}` : ''}
    </div>
  )
}

export type SearchPaginationProps = {
  canPreviousPage: boolean
  canNextPage: boolean
  loading?: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

export function SearchPagination(props: SearchPaginationProps) {
  if (!props.canPreviousPage && !props.canNextPage && !props.loading) return null
  return (
    <nav className="zy-search-pagination" aria-label="搜索结果分页" aria-busy={props.loading || undefined}>
      <button
        className="zy-search-page-button"
        type="button"
        disabled={props.loading || !props.canPreviousPage}
        onClick={props.onPreviousPage}
      >
        上一页
      </button>
      <button
        className="zy-search-page-button"
        type="button"
        disabled={props.loading || !props.canNextPage}
        onClick={props.onNextPage}
      >
        下一页
      </button>
    </nav>
  )
}

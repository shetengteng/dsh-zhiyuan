import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

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
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={props.loading || !props.canPreviousPage}
        onClick={props.onPreviousPage}
      >
        上一页
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={props.loading || !props.canNextPage}
        onClick={props.onNextPage}
      >
        下一页
      </Button>
    </nav>
  )
}

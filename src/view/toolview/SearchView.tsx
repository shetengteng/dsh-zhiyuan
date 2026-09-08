import { ensureSettingsStyles } from '../settings/styles.ts'
import { SearchFileDetailCard } from '../search/SearchFileDetailCard.tsx'
import { SearchOverviewCard } from '../search/SearchOverviewCard.tsx'
import { canSearchNextPage, canSearchPreviousPage } from '../search/search-pages.ts'
import type { KnowledgePrivateConnection } from '../bridge.ts'
import type { PreviewController } from './preview/preview-state.ts'
import { firstTextContent, type ToolResultBlock } from './tool-result-types.ts'
import { useKbSearchResult } from './use-kb-search-result.ts'

export type SearchViewProps = {
  toolName?: string
  block?: ToolResultBlock
}

export function createSearchView(preview: PreviewController, connection?: KnowledgePrivateConnection) {
  return function SearchView(props: SearchViewProps) {
    ensureSettingsStyles()
    const state = useKbSearchResult(props.block, preview, connection)

    if (state.running) return <div className="zy-help">正在检索知识库…</div>
    if (state.failed) return <div className="zy-note is-error" role="alert">{firstTextContent(props.block?.content) || '检索失败'}</div>
    if (state.parseError || !state.result) return <div className="zy-note is-error" role="alert">{state.parseError || '检索结果无效'}</div>

    if (state.result.kind === 'overview') {
      return (
        <SearchOverviewCard
          result={state.result}
          openingPath={state.openingPath || undefined}
          openingError={state.openingError || undefined}
          onOpenFile={state.openFile}
          onLoadMore={state.loadMore}
          loadingMore={state.pageBusy}
        />
      )
    }
    return (
      <SearchFileDetailCard
        result={state.result}
        preview={preview}
        onBack={state.overviewResult ? state.goBack : undefined}
        pagination={{
          canPreviousPage: canSearchPreviousPage(state.detailHistory),
          canNextPage: canSearchNextPage(state.detailHistory),
          loading: state.pageBusy,
          onPreviousPage: state.goPreviousPage,
          onNextPage: state.goNextPage,
        }}
        error={state.openingError || undefined}
      />
    )
  }
}

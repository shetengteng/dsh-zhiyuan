import { useEffect, useRef, useState } from 'react'
import type { SearchOverviewResult, SearchResult } from '../models.ts'
import { callKnowledgeHost, type KnowledgePrivateConnection } from '../bridge.ts'
import { parseSearchResult } from '../host-payload.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { SearchFileDetailCard } from '../search/SearchFileDetailCard.tsx'
import { SearchOverviewCard } from '../search/SearchOverviewCard.tsx'
import {
  appendSearchPage,
  appendSearchPageHistory,
  canSearchNextPage,
  canSearchPreviousPage,
  createSearchPageHistory,
  getSearchNextCursor,
  getSearchPage,
  SEARCH_PAGE_SIZE,
  selectSearchPage,
  type SearchPageHistory,
} from '../search/search-pages.ts'
import type { PreviewController } from './preview/preview-state.ts'

export type ToolResultBlock = {
  kind?: string
  isError?: boolean
  content?: Array<{ type?: string; text?: string }>
  meta?: unknown
}

function firstTextContent(content: ToolResultBlock['content']): string {
  if (!Array.isArray(content)) return ''
  for (const block of content) if (block?.type === 'text' && typeof block.text === 'string') return block.text
  return ''
}

export function createKbSearchView(preview: PreviewController, connection?: KnowledgePrivateConnection) {
  return function KbSearchView(props: { toolName?: string; block?: ToolResultBlock }) {
    ensureSettingsStyles()
    const block = props.block
    const running = !block || block.kind !== 'tool-result'
    const failed = block?.kind === 'tool-result' && Boolean(block.isError)
    let sourceResult: SearchResult | null = null
    let parseError = ''
    if (!running && !failed) {
      try {
        sourceResult = parseSearchResult(block?.meta)
      } catch (error) {
        parseError = error instanceof Error ? error.message : '检索结果无效'
      }
    }

    const [activeResult, setActiveResult] = useState<SearchResult | null>(null)
    const [overviewResult, setOverviewResult] = useState<SearchOverviewResult | null>(() => sourceResult?.kind === 'overview' ? sourceResult : null)
    const [detailHistory, setDetailHistory] = useState<SearchPageHistory | null>(() => sourceResult?.kind === 'file-detail' ? createSearchPageHistory(sourceResult) : null)
    const [openingPath, setOpeningPath] = useState('')
    const [openingError, setOpeningError] = useState('')
    const [pageBusy, setPageBusy] = useState(false)
    const actionController = useRef<AbortController | null>(null)
    const blockRef = useRef<ToolResultBlock | undefined>(block)

    useEffect(() => {
      if (blockRef.current === block) return
      blockRef.current = block
      actionController.current?.abort()
      actionController.current = null
      setActiveResult(null)
      setOverviewResult(sourceResult?.kind === 'overview' ? sourceResult : null)
      setDetailHistory(sourceResult?.kind === 'file-detail' ? createSearchPageHistory(sourceResult) : null)
      setOpeningPath('')
      setOpeningError('')
      setPageBusy(false)
      preview.clear()
    }, [block, preview])

    useEffect(() => () => {
      actionController.current?.abort()
      actionController.current = null
    }, [])

    const cancelAction = () => {
      actionController.current?.abort()
      actionController.current = null
      setPageBusy(false)
    }

    if (running) return <div className="zy-help">正在检索知识库…</div>
    if (failed) return <div className="zy-note is-error" role="alert">{firstTextContent(block?.content) || '检索失败'}</div>
    if (parseError || !sourceResult) return <div className="zy-note is-error" role="alert">{parseError || '检索结果无效'}</div>

    const result = activeResult ?? sourceResult
    const openFile = (entryPath: string) => {
      if (result.kind !== 'overview') return
      cancelAction()
      const controller = new AbortController()
      actionController.current = controller
      const isCurrent = () => actionController.current === controller && !controller.signal.aborted
      setDetailHistory(null)
      setOpeningPath(entryPath)
      setOpeningError('')
      void callKnowledgeHost(connection, {
        op: 'search',
        baseId: result.baseId,
        query: result.query.terms[0] ?? '',
        aliases: result.query.aliases,
        ...(result.category ? { category: result.category } : {}),
        path: entryPath,
        limit: SEARCH_PAGE_SIZE,
      }, controller.signal).then((value) => {
        if (!isCurrent()) return
        const detail = parseSearchResult(value)
        if (detail.kind !== 'file-detail') throw new Error('Host 未返回文件详情')
        setActiveResult(detail)
        setDetailHistory(createSearchPageHistory(detail))
        setOpeningPath('')
        setOpeningError('')
        preview.clear()
      }).catch((error: unknown) => {
        if (isCurrent()) setOpeningError(error instanceof Error ? error.message : '文件详情加载失败')
      }).finally(() => {
        if (actionController.current === controller) actionController.current = null
      })
    }

    const loadMore = (cursor: string) => {
      if (!cursor || pageBusy) return
      cancelAction()
      const controller = new AbortController()
      actionController.current = controller
      const isCurrent = () => actionController.current === controller && !controller.signal.aborted
      setPageBusy(true)
      setOpeningError('')
      void callKnowledgeHost(connection, { op: 'search', cursor, limit: SEARCH_PAGE_SIZE }, controller.signal).then((value) => {
        if (!isCurrent()) return
        const next = parseSearchResult(value)
        const merged = appendSearchPage(result, next)
        setActiveResult(merged)
        if (merged.kind === 'overview') setOverviewResult(merged)
        setOpeningError(next.scan.warnings.join('；'))
      }).catch((error: unknown) => {
        if (isCurrent()) setOpeningError(error instanceof Error ? error.message : '加载下一页失败')
      }).finally(() => {
        if (actionController.current !== controller) return
        actionController.current = null
        setPageBusy(false)
      })
    }

    const goBack = () => {
      cancelAction()
      setActiveResult(overviewResult)
      setDetailHistory(null)
      setOpeningPath('')
      setOpeningError('')
      preview.clear()
    }

    const goPreviousPage = () => {
      const history = detailHistory
      if (pageBusy || !canSearchPreviousPage(history) || !history) return
      const previousHistory = selectSearchPage(history, history.currentIndex - 1)
      const previous = getSearchPage(previousHistory)
      if (!previous || previous.kind !== 'file-detail') return
      setDetailHistory(previousHistory)
      setActiveResult(previous)
      setOpeningError(previous.scan.warnings.join('；'))
      preview.clear()
    }

    const goNextPage = () => {
      const history = detailHistory
      const currentResult = result
      if (pageBusy || !history || currentResult.kind !== 'file-detail') return
      const cachedIndex = history.currentIndex + 1
      if (cachedIndex < history.pages.length) {
        const nextHistory = selectSearchPage(history, cachedIndex)
        const next = getSearchPage(nextHistory)
        if (!next || next.kind !== 'file-detail') return
        setDetailHistory(nextHistory)
        setActiveResult(next)
        setOpeningError(next.scan.warnings.join('；'))
        preview.clear()
        return
      }
      const cursor = getSearchNextCursor(currentResult)
      if (!cursor) return
      cancelAction()
      const controller = new AbortController()
      actionController.current = controller
      const isCurrent = () => actionController.current === controller && !controller.signal.aborted
      setPageBusy(true)
      setOpeningError('')
      void callKnowledgeHost(connection, { op: 'search', cursor, limit: SEARCH_PAGE_SIZE }, controller.signal).then((value) => {
        if (!isCurrent()) return
        const next = parseSearchResult(value)
        if (next.kind !== 'file-detail') throw new Error('Host 未返回文件详情')
        setDetailHistory(appendSearchPageHistory(history, next))
        setActiveResult(next)
        setOpeningError(next.scan.warnings.join('；'))
        preview.clear()
      }).catch((error: unknown) => {
        if (isCurrent()) setOpeningError(error instanceof Error ? error.message : '加载下一页失败')
      }).finally(() => {
        if (actionController.current !== controller) return
        actionController.current = null
        setPageBusy(false)
      })
    }

    if (result.kind === 'overview') {
      return (
        <SearchOverviewCard
          result={result}
          openingPath={openingPath || undefined}
          openingError={openingError || undefined}
          onOpenFile={openFile}
          onLoadMore={loadMore}
          loadingMore={pageBusy}
        />
      )
    }
    return (
      <SearchFileDetailCard
        result={result}
        preview={preview}
        onBack={overviewResult ? goBack : undefined}
        pagination={{
          canPreviousPage: canSearchPreviousPage(detailHistory),
          canNextPage: canSearchNextPage(detailHistory),
          loading: pageBusy,
          onPreviousPage: goPreviousPage,
          onNextPage: goNextPage,
        }}
        error={openingError || undefined}
      />
    )
  }
}

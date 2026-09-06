import { useEffect, useRef, useState } from 'react'
import type { SearchOverviewResult, SearchResult } from '../models.ts'
import { callKnowledgeHost, type KnowledgePrivateConnection } from '../bridge.ts'
import { parseSearchResult } from '../host-payload.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { SearchFileDetailCard } from '../search/SearchFileDetailCard.tsx'
import { SearchOverviewCard } from '../search/SearchOverviewCard.tsx'
import { appendSearchPage } from '../search/search-pages.ts'
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
      setOpeningPath('')
      setOpeningError('')
      setPageBusy(false)
      preview.clear()
    }, [block, preview])

    useEffect(() => () => actionController.current?.abort(), [])

    if (running) return <div className="zy-help">正在检索知识库…</div>
    if (failed) return <div className="zy-note is-error" role="alert">{firstTextContent(block?.content) || '检索失败'}</div>
    if (parseError || !sourceResult) return <div className="zy-note is-error" role="alert">{parseError || '检索结果无效'}</div>

    const result = activeResult ?? sourceResult
    const openFile = (entryPath: string) => {
      if (result.kind !== 'overview') return
      actionController.current?.abort()
      const controller = new AbortController()
      actionController.current = controller
      setOpeningPath(entryPath)
      setOpeningError('')
      void callKnowledgeHost(connection, {
        op: 'search',
        baseId: result.baseId,
        query: result.query.terms[0] ?? '',
        aliases: result.query.aliases,
        ...(result.category ? { category: result.category } : {}),
        path: entryPath,
        limit: 20,
      }, controller.signal).then((value) => {
        if (controller.signal.aborted) return
        const detail = parseSearchResult(value)
        if (detail.kind !== 'file-detail') throw new Error('Host 未返回文件详情')
        setActiveResult(detail)
        setOpeningPath('')
        setOpeningError('')
        preview.clear()
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setOpeningError(error instanceof Error ? error.message : '文件详情加载失败')
      })
    }

    const loadMore = (cursor: string) => {
      if (!cursor || pageBusy) return
      actionController.current?.abort()
      const controller = new AbortController()
      actionController.current = controller
      setPageBusy(true)
      void callKnowledgeHost(connection, { op: 'search', cursor }, controller.signal).then((value) => {
        if (controller.signal.aborted) return
        const next = parseSearchResult(value)
        const merged = appendSearchPage(result, next)
        setActiveResult(merged)
        if (merged.kind === 'overview') setOverviewResult(merged)
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setOpeningError(error instanceof Error ? error.message : '加载下一页失败')
      }).finally(() => {
        if (!controller.signal.aborted) setPageBusy(false)
      })
    }

    const goBack = () => {
      actionController.current?.abort()
      setActiveResult(overviewResult)
      setOpeningPath('')
      setOpeningError('')
      preview.clear()
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
        onLoadMore={loadMore}
        loadingMore={pageBusy}
        error={openingError || undefined}
      />
    )
  }
}

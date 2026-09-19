import { useEffect, useMemo, useState } from 'react'
import type { ReadEntryResponse, SearchHit } from '../../types.ts'
import { CitationTag } from '../../CitationTag.tsx'
import { matchedExcerptLine } from '../../search/hit-display.ts'
import { ensureSettingsStyles } from '../../settings/styles.ts'
import { EntryPreviewContent } from '../../../content/client-api.tsx'
import { parsePreviewSelection } from './preview-selection.ts'
import type { PreviewController, PreviewLoader } from './preview-state.ts'

/** 右侧栏 tab 的运行时信息；由 `sidebar.right.pane.tab` 座椅按 hooks.tabInfo 注入。 */
export type PreviewTabInfo = {
  tab: {
    navigation: { params: unknown; revision: number }
    signal: AbortSignal
    actions: { close: () => void }
  }
}

export type UsePreviewTabInfo = () => PreviewTabInfo

export type KbPreviewPanelProps = {
  useTabInfo: UsePreviewTabInfo
}

type PreviewLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; preview: ReadEntryResponse }
  | { status: 'error'; error: string }

/**
 * 预览 tab 的主体：命中随导航参数到达，内容只经 Host 读取。
 * 关闭按钮与 Escape 都交给 tab 自身的 actions，不碰右侧栏的私有 DOM。
 */
export function createKbPreviewPanel(loadPreview: PreviewLoader, preview: PreviewController) {
  return function KbPreviewPanel(props: KbPreviewPanelProps) {
    ensureSettingsStyles()
    const { tab } = props.useTabInfo()
    const { navigation, signal, actions } = tab
    const selection = useMemo(() => parsePreviewSelection(navigation.params), [navigation.params])
    const [state, setState] = useState<PreviewLoadState>({ status: 'idle' })

    useEffect(() => {
      if (!selection) {
        setState({ status: 'idle' })
        return
      }
      const controller = new AbortController()
      const abort = () => controller.abort()
      if (signal.aborted) controller.abort()
      else signal.addEventListener('abort', abort)
      setState({ status: 'loading' })
      void loadPreview(selection, controller.signal).then((value) => {
        if (controller.signal.aborted) return
        setState({ status: 'ready', preview: value })
      }).catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortReason(reason)) return
        setState({ status: 'error', error: reason instanceof Error ? reason.message : '预览加载失败' })
      })
      return () => {
        signal.removeEventListener('abort', abort)
        controller.abort()
      }
    }, [loadPreview, signal, navigation, selection])

    useEffect(() => {
      if (!selection) return
      return () => preview.release(selection)
    }, [preview, selection])

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        actions.close()
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [actions])

    const hit = selection?.hit
    return (
      <aside className="zy-preview-panel" aria-label={hit ? `${fileName(hit.path)} 引用 ${hit.n}` : '预览'}>
        <div className="zy-preview-head">
          <div className="zy-preview-head-copy">
            <div className="zy-preview-title">{hit ? <PreviewTitle hit={hit} /> : '预览'}</div>
            {hit ? <PreviewLocation hit={hit} /> : null}
          </div>
          <button className="zy-preview-close" type="button" aria-label="关闭预览" onClick={() => actions.close()}>×</button>
        </div>
        {hit ? <PreviewContent hit={hit} state={state} /> : <PreviewEmpty />}
      </aside>
    )
  }
}

function PreviewLocation(props: { hit: SearchHit }) {
  return <div className="zy-preview-location">第 {props.hit.startLine}–{props.hit.endLine} 行 · 命中第 {props.hit.matchLine} 行</div>
}

function PreviewTitle(props: { hit: SearchHit }) {
  return (
    <>
      <span className="zy-preview-filename" title={props.hit.path}>{fileName(props.hit.path)}</span>
      <CitationTag n={props.hit.n} />
    </>
  )
}

function PreviewContent(props: { hit: SearchHit; state: PreviewLoadState }) {
  const { hit, state } = props
  if (state.status === 'loading' || state.status === 'idle') {
    return <FallbackPreview hit={hit} status="正在加载命中附近…" />
  }
  if (state.status === 'error') {
    return <FallbackPreview hit={hit} status={state.error} />
  }
  if (state.preview.previewStatus !== 'ready') {
    return <FallbackPreview hit={hit} status={state.preview.previewStatus === 'stale' ? '文件已变化，显示命中片段' : '命中位置已失效，显示命中片段'} />
  }
  return (
    <div className="zy-preview-body">
      <EntryPreviewContent preview={state.preview} mode="read" highlightText={matchedExcerptLine(hit)} />
    </div>
  )
}

function FallbackPreview(props: { hit: SearchHit; status: string }) {
  return (
    <div className="zy-preview-body">
      <div className="zy-preview-status" role="status">{props.status}</div>
      <pre className="zy-pre">{matchedExcerptLine(props.hit)}</pre>
    </div>
  )
}

function PreviewEmpty() {
  return (
    <div className="zy-preview-empty">
      <div className="zy-preview-empty-title">没有可预览的命中</div>
      <p>请点击对话中的引用卡片重新打开预览。</p>
    </div>
  )
}

function fileName(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.split('/').at(-1) || path
}

function isAbortReason(reason: unknown): boolean {
  return Boolean(reason && typeof reason === 'object' && (reason as { name?: unknown }).name === 'AbortError')
}
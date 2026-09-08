import { useEffect } from 'react'
import type { ReadEntryResult, SearchHit } from '../../types.ts'
import { CitationTag } from '../../CitationTag.tsx'
import { matchedExcerptLine } from '../../search/hit-display.ts'
import { ensureSettingsStyles } from '../../settings/styles.ts'
import { EntryPreviewContent } from '../../../content/client-api.tsx'
import type { PreviewController } from './preview-state.ts'
import { usePreviewState } from './preview-state.ts'

type DetailsPanelProps = {
  closeDetails?: () => void
  sessionId?: string
}

export function createKbPreviewPanel(preview: PreviewController) {
  return function KbPreviewPanel(props: DetailsPanelProps) {
    ensureSettingsStyles()
    const previewState = usePreviewState(preview)
    const selectedHit = previewState.selected

    useEffect(() => {
      preview.activateSession(props.sessionId)
    }, [preview, props.sessionId])

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        preview.clear()
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [preview])

    const close = () => {
      preview.clear()
      props.closeDetails?.()
    }

    const title = selectedHit ? <PreviewTitle hit={selectedHit} /> : '选择引用'

    return (
      <aside className="zy-preview-panel" aria-label={selectedHit ? `${fileName(selectedHit.path)} 引用 ${selectedHit.n}` : '预览'}>
        <div className="zy-preview-head">
          <div className="zy-preview-head-copy">
            <div className="zy-preview-title">{title}</div>
            {selectedHit ? <PreviewLocation hit={selectedHit} /> : null}
          </div>
          <button className="zy-preview-close" type="button" aria-label="关闭预览" onClick={close}>×</button>
        </div>
        {selectedHit ? (
          <PreviewContent
            hit={selectedHit}
            preview={previewState.preview}
            status={previewState.status}
            error={previewState.error}
          />
        ) : <PreviewEmpty />}
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

function PreviewContent(props: { hit: SearchHit; preview: ReadEntryResult | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string }) {
  const { hit } = props
  if (props.status === 'loading') {
    return <FallbackPreview hit={hit} status="正在加载命中附近…" />
  }
  if (props.status === 'error' || !props.preview) {
    return <FallbackPreview hit={hit} status={props.error || '预览加载失败，显示命中片段'} />
  }
  if (props.preview.previewStatus !== 'ready') {
    return <FallbackPreview hit={hit} status={props.preview.previewStatus === 'stale' ? '文件已变化，显示命中片段' : '命中位置已失效，显示命中片段'} />
  }
  return (
    <div className="zy-preview-body">
      <EntryPreviewContent preview={props.preview} mode="read" highlightText={matchedExcerptLine(hit)} />
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
      <div className="zy-preview-empty-title">选择一条命中结果</div>
      <p>点击对话中的引用卡片，在这里查看命中附近的原文。</p>
    </div>
  )
}

function fileName(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.split('/').at(-1) || path
}

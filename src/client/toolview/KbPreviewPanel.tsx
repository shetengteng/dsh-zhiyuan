import { useEffect, useLayoutEffect, useRef } from 'react'
import type { SearchHit } from '../models.ts'
import { CitationTag } from '../CitationTag.tsx'
import { matchedExcerptLine } from '../search-utils.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { TiptapEditor } from '../settings/MdEditor.tsx'
import type { PreviewController } from './preview-state.ts'
import { usePreviewState } from './preview-state.ts'
import { widenPreviewDetailsPanel } from './preview-width.ts'

type DetailsPanelProps = {
  closeDetails?: () => void
  sessionId?: string
}

export function createKbPreviewPanel(preview: PreviewController) {
  return function KbPreviewPanel(props: DetailsPanelProps) {
    ensureSettingsStyles()
    const previewState = usePreviewState(preview)
    const selectedHit = previewState.selected
    const panelRef = useRef<HTMLElement>(null)
    const headRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      preview.activateSession(props.sessionId)
    }, [preview, props.sessionId])

    useEffect(() => {
      if (!panelRef.current) return
      return widenPreviewDetailsPanel(panelRef.current)
    }, [])

    useLayoutEffect(() => {
      const head = headRef.current
      const mainHeader = findConversationHeader()
      if (!head || !mainHeader) return

      const syncHeight = () => {
        const height = Math.round(mainHeader.getBoundingClientRect().height)
        if (!Number.isFinite(height) || height < 40 || height > 180) return
        head.style.setProperty('height', `${height}px`)
        head.style.setProperty('min-height', `${height}px`)
      }

      syncHeight()
      const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(syncHeight)
      resizeObserver?.observe(mainHeader)
      const animationFrame = typeof requestAnimationFrame === 'undefined' ? undefined : requestAnimationFrame(syncHeight)

      return () => {
        if (animationFrame !== undefined && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(animationFrame)
        resizeObserver?.disconnect()
        head.style.removeProperty('height')
        head.style.removeProperty('min-height')
      }
    }, [])

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
      <aside ref={panelRef} className="zy-preview-panel" aria-label={selectedHit ? `${fileName(selectedHit.path)} 引用 ${selectedHit.n}` : '预览'}>
        <div ref={headRef} className="zy-preview-head">
          <div className="zy-preview-head-copy">
            <div className="zy-preview-title">{title}</div>
            {selectedHit ? <PreviewLocation hit={selectedHit} /> : null}
          </div>
          <button className="zy-preview-close" type="button" aria-label="关闭预览" onClick={close}>×</button>
        </div>
        {selectedHit ? (
          <PreviewContent
            hit={selectedHit}
            text={previewState.text ?? selectedHit.excerpt}
            complete={previewState.complete}
          />
        ) : <PreviewEmpty />}
      </aside>
    )
  }
}

function findConversationHeader(): HTMLElement | null {
  const scrollBody = document.querySelector<HTMLElement>('[data-conversation-scroll]')
  const headerSlot = scrollBody?.previousElementSibling
  const header = headerSlot?.matches('header') ? headerSlot : headerSlot?.querySelector('header')
  return header instanceof HTMLElement && header.tagName === 'HEADER' ? header : null
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

function PreviewContent(props: { hit: SearchHit; text: string; complete: boolean }) {
  const { hit } = props
  return (
    <div className="zy-preview-body">
      {!props.complete ? <div className="zy-preview-status" role="status">当前检索结果没有携带全文，显示命中片段</div> : null}
      <TiptapEditor
        key={`${hit.path}-${hit.startLine}-${hit.endLine}-${hit.matchLine}`}
        text={props.text}
        startLine={hit.startLine}
        endLine={hit.endLine}
        focusLine={hit.matchLine}
        highlightText={matchedExcerptLine(hit)}
        readonly
      />
    </div>
  )
}

function PreviewEmpty() {
  return (
    <div className="zy-preview-empty">
      <div className="zy-preview-empty-title">选择一条命中结果</div>
      <p>点击对话中的引用卡片，在这里查看完整文档内容。</p>
    </div>
  )
}

function fileName(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.split('/').at(-1) || path
}

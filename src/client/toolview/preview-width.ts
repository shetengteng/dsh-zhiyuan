const PREVIEW_DETAILS_WIDTH = 420
const DETAILS_MIN_WIDTH = 300
const CENTER_MIN_WIDTH = 640

type InlineStyleValue = {
  value: string
  priority: string
}

type LayoutFrame = {
  frame: HTMLElement
  detailsColumn: HTMLElement
}

/**
 * DSH 0.1.1-rc.2 exposes details open/close, but not a details-width action.
 * Keep this compatibility seam isolated: it only touches the host's resolved
 * three-column geometry while this preview is mounted, and restores the inline
 * values when the preview is released.
 */
export function widenPreviewDetailsPanel(panel: HTMLElement): () => void {
  const layout = findLayoutFrame(panel)
  if (!layout) return () => undefined

  const { frame, detailsColumn } = layout
  const handle = frame.querySelector<HTMLElement>('[data-side="details"]')
  const originalGrid = rememberInlineStyle(frame, 'grid-template-columns')
  const originalHandleLeft = handle ? rememberInlineStyle(handle, 'left') : undefined
  let appliedGrid = ''
  let appliedHandleLeft = ''
  let disposed = false
  let scheduled = false

  const apply = () => {
    if (disposed) return
    const metrics = readMetrics(frame, detailsColumn)
    if (!metrics || metrics.details <= 0) return

    const availableDetails = metrics.frame - metrics.sidebar - CENTER_MIN_WIDTH
    const target = Math.min(PREVIEW_DETAILS_WIDTH, availableDetails)
    if (!Number.isFinite(target) || target < DETAILS_MIN_WIDTH || target <= metrics.details + 1) return

    const nextGrid = `${metrics.sidebar}px minmax(0, 1fr) ${target}px`
    if (frame.style.getPropertyValue('grid-template-columns') !== nextGrid || frame.style.getPropertyPriority('grid-template-columns') !== 'important') {
      frame.style.setProperty('grid-template-columns', nextGrid, 'important')
      appliedGrid = nextGrid
    }

    if (handle) {
      const nextHandleLeft = `${metrics.frame - target}px`
      if (handle.style.getPropertyValue('left') !== nextHandleLeft || handle.style.getPropertyPriority('left') !== 'important') {
        handle.style.setProperty('left', nextHandleLeft, 'important')
        appliedHandleLeft = nextHandleLeft
      }
    }
  }

  const schedule = () => {
    if (scheduled || disposed) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      apply()
    })
  }

  const mutationObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(schedule)
  mutationObserver?.observe(frame, { attributes: true, attributeFilter: ['style'] })
  const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(apply)
  resizeObserver?.observe(frame)
  apply()
  const animationFrame = typeof requestAnimationFrame === 'undefined' ? undefined : requestAnimationFrame(apply)

  return () => {
    disposed = true
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
    restoreInlineStyle(frame, 'grid-template-columns', originalGrid, appliedGrid)
    if (handle && originalHandleLeft !== undefined) restoreInlineStyle(handle, 'left', originalHandleLeft, appliedHandleLeft)
  }
}

function findLayoutFrame(panel: HTMLElement): LayoutFrame | null {
  let detailsColumn = panel.parentElement
  while (detailsColumn?.parentElement) {
    const frame = detailsColumn.parentElement
    const style = getComputedStyle(frame)
    if (style.display === 'grid' && frame.children.length >= 3 && Array.from(frame.children).includes(detailsColumn)) {
      return { frame, detailsColumn }
    }
    detailsColumn = frame
  }
  return null
}

function readMetrics(frame: HTMLElement, detailsColumn: HTMLElement): { frame: number; sidebar: number; details: number } | null {
  const frameWidth = Math.round(frame.getBoundingClientRect().width)
  const sidebar = frame.firstElementChild instanceof HTMLElement ? Math.round(frame.firstElementChild.getBoundingClientRect().width) : 0
  const details = Math.round(detailsColumn.getBoundingClientRect().width)
  if (!Number.isFinite(frameWidth) || !Number.isFinite(sidebar) || !Number.isFinite(details) || frameWidth <= 0 || sidebar < 0 || details < 0) return null
  return { frame: frameWidth, sidebar, details }
}

function rememberInlineStyle(element: HTMLElement, property: string): InlineStyleValue {
  return {
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }
}

function restoreInlineStyle(element: HTMLElement, property: string, original: InlineStyleValue, applied: string): void {
  if (!applied || element.style.getPropertyValue(property) !== applied) return
  if (original.value) element.style.setProperty(property, original.value, original.priority)
  else element.style.removeProperty(property)
}

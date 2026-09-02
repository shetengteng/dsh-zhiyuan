const PREVIEW_DETAILS_DEFAULT = 520
const PREVIEW_DETAILS_MAX = 960
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

type LayoutMetrics = {
  frame: number
  sidebar: number
  details: number
}

/**
 * DSH 0.1.1-rc.2 exposes details open/close, but not a details-width action.
 * Host drag is clamped to 300–520px. While this preview is mounted, apply a
 * 520px default, then take over the details handle so the column can grow to
 * 960px (or whatever remains after the 640px center floor). Restore inline
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
  let preferredWidth: number | null = null
  let disposed = false
  let scheduled = false
  let dragging = false
  let stopDrag: (() => void) | undefined

  const apply = (nextWidth?: number) => {
    if (disposed) return
    const metrics = readMetrics(frame, detailsColumn)
    if (!metrics || metrics.details <= 0) return

    const maxWidth = detailsCeiling(metrics)
    if (!Number.isFinite(maxWidth) || maxWidth < DETAILS_MIN_WIDTH) return

    const requested = nextWidth ?? preferredWidth ?? PREVIEW_DETAILS_DEFAULT
    const target = clampWidth(requested, DETAILS_MIN_WIDTH, maxWidth)
    writeColumn(frame, handle, metrics, target)
  }

  const writeColumn = (nextFrame: HTMLElement, nextHandle: HTMLElement | null, metrics: LayoutMetrics, target: number) => {
    const nextGrid = `${metrics.sidebar}px minmax(0, 1fr) ${target}px`
    if (nextFrame.style.getPropertyValue('grid-template-columns') !== nextGrid || nextFrame.style.getPropertyPriority('grid-template-columns') !== 'important') {
      nextFrame.style.setProperty('grid-template-columns', nextGrid, 'important')
      appliedGrid = nextGrid
    }

    if (!nextHandle) return
    const nextHandleLeft = `${metrics.frame - target}px`
    if (nextHandle.style.getPropertyValue('left') !== nextHandleLeft || nextHandle.style.getPropertyPriority('left') !== 'important') {
      nextHandle.style.setProperty('left', nextHandleLeft, 'important')
      appliedHandleLeft = nextHandleLeft
    }
  }

  const schedule = () => {
    if (scheduled || disposed || dragging) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      apply()
    })
  }

  const onHandlePointerDown = (event: PointerEvent) => {
    if (disposed || event.button !== 0) return
    const metrics = readMetrics(frame, detailsColumn)
    if (!metrics || metrics.details <= 0) return

    event.preventDefault()
    event.stopImmediatePropagation()
    dragging = true
    const originX = event.clientX
    const originWidth = metrics.details
    frame.setAttribute('data-dragging', '')
    handle?.setAttribute('data-dragging', 'true')

    const onMove = (moveEvent: PointerEvent) => {
      if (disposed) return
      preferredWidth = clampWidth(originWidth - (moveEvent.clientX - originX), DETAILS_MIN_WIDTH, PREVIEW_DETAILS_MAX)
      apply(preferredWidth)
    }

    const onRelease = () => {
      stopDrag?.()
    }

    stopDrag = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onRelease)
      window.removeEventListener('pointercancel', onRelease)
      stopDrag = undefined
      dragging = false
      frame.removeAttribute('data-dragging')
      handle?.removeAttribute('data-dragging')
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onRelease)
    window.addEventListener('pointercancel', onRelease)
  }

  const mutationObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(schedule)
  mutationObserver?.observe(frame, { attributes: true, attributeFilter: ['style'] })
  const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
  resizeObserver?.observe(frame)

  handle?.addEventListener('pointerdown', onHandlePointerDown, true)
  apply()
  const animationFrame = typeof requestAnimationFrame === 'undefined' ? undefined : requestAnimationFrame(() => apply())

  return () => {
    disposed = true
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
    handle?.removeEventListener('pointerdown', onHandlePointerDown, true)
    stopDrag?.()
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
    restoreInlineStyle(frame, 'grid-template-columns', originalGrid, appliedGrid)
    if (handle && originalHandleLeft !== undefined) restoreInlineStyle(handle, 'left', originalHandleLeft, appliedHandleLeft)
  }
}

function detailsCeiling(metrics: LayoutMetrics): number {
  return Math.min(PREVIEW_DETAILS_MAX, metrics.frame - metrics.sidebar - CENTER_MIN_WIDTH)
}

function clampWidth(px: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(px)))
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

function readMetrics(frame: HTMLElement, detailsColumn: HTMLElement): LayoutMetrics | null {
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

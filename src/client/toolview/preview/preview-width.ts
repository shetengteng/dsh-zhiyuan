const PREVIEW_DETAILS_WIDTH = 520
const DETAILS_MIN_WIDTH = 300
const CENTER_MIN_WIDTH = 640
const DSH_DEFAULT_DETAILS_WIDTH = 360
const DEFAULT_WIDTH_SLACK = 24

type InlineStyleValue = {
  value: string
  priority: string
}

type LayoutFrame = {
  frame: HTMLElement
  detailsColumn: HTMLElement
}

/**
 * DSH 0.1.1-rc.2 只暴露详情栏开/关，没有改宽度的动作。
 * 预览挂载期间把壳的第三列从默认 360px 加宽，然后不再干预：
 * 壳本身允许拖到 300–520px。仅当壳重置回默认列宽时再套一次。
 * 预览释放时恢复原来的 inline 值。
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
  let released = false

  const apply = () => {
    if (disposed || released) return
    const metrics = readMetrics(frame, detailsColumn)
    if (!metrics || metrics.details <= 0) return

    const availableDetails = metrics.frame - metrics.sidebar - CENTER_MIN_WIDTH
    const target = Math.min(PREVIEW_DETAILS_WIDTH, availableDetails)
    if (!Number.isFinite(target) || target < DETAILS_MIN_WIDTH || target <= metrics.details + 1) return
    if (metrics.details > DSH_DEFAULT_DETAILS_WIDTH + DEFAULT_WIDTH_SLACK) return

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
    if (scheduled || disposed || released) return
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

  const releaseToHost = () => {
    if (disposed || released) return
    released = true
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
    if (appliedGrid && frame.style.getPropertyValue('grid-template-columns') === appliedGrid) {
      frame.style.setProperty('grid-template-columns', appliedGrid)
    }
    if (handle && appliedHandleLeft && handle.style.getPropertyValue('left') === appliedHandleLeft) {
      handle.style.setProperty('left', appliedHandleLeft)
    }
  }

  handle?.addEventListener('pointerdown', releaseToHost, true)
  apply()
  const animationFrame = typeof requestAnimationFrame === 'undefined' ? undefined : requestAnimationFrame(apply)

  return () => {
    disposed = true
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
    handle?.removeEventListener('pointerdown', releaseToHost, true)
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

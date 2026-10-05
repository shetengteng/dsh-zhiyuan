/** 临时拖拽诊断探针：把 document 级拖拽事件摘要上报到本机 beacon，定位 Safari 拖拽问题后移除。 */
import { claimFileDrag, listDragTypes } from './settings/drag-utils.ts'

const BEACON_URL = 'http://127.0.0.1:56789/drag-beacon'

export function installDragBeacon(): () => void {
  if (typeof window === 'undefined') return () => {}
  const globalWindow = window as typeof window & { __zyDragBeacon?: boolean }
  if (globalWindow.__zyDragBeacon) return () => {}
  globalWindow.__zyDragBeacon = true

  let lastOverAt = 0
  const report = (payload: Record<string, unknown>) => {
    void fetch(BEACON_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...payload, t: Date.now() }),
    }).catch(() => {})
  }

  const summarize = (event: DragEvent) => {
    const transfer = event.dataTransfer
    const first = transfer ? transfer.files.item(0) : null
    return {
      phase: event.eventPhase,
      types: transfer ? listDragTypes(transfer) : null,
      files: transfer ? transfer.files.length : null,
      firstFile: first ? { size: first.size, mime: first.type } : null,
      dropEffect: transfer ? transfer.dropEffect : null,
      target: event.target instanceof Element ? event.target.className.toString().slice(0, 30) : 'non-element',
    }
  }

  const handlers: Array<[string, EventListener]> = []
  for (const type of ['dragenter', 'dragover', 'drop', 'dragleave', 'dragend']) {
    const listener: EventListener = (raw) => {
      if (!(raw instanceof DragEvent)) return
      if (type === 'dragover' && Date.now() - lastOverAt < 400) return
      if (type === 'dragover') lastOverAt = Date.now()
      const claimed = claimFileDrag({
        preventDefault: () => raw.preventDefault(),
        stopPropagation: () => raw.stopPropagation(),
        dataTransfer: raw.dataTransfer,
      }, 'copy')
      report({ type, ...summarize(raw), claimed })
    }
    document.addEventListener(type, listener, true)
    handlers.push([type, listener])
  }
  return () => {
    for (const [type, handler] of handlers) document.removeEventListener(type, handler, true)
    globalWindow.__zyDragBeacon = false
  }
}

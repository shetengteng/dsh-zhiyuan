import { useEffect, useState } from 'react'
import type { ReadEntryResponse, SearchHit } from '../../types.ts'
import { isSamePreviewHit, type PreviewSelection } from './preview-selection.ts'

/** 打开预览页类型；由右侧栏调用，页类型负责展开右栏。 */
export type PreviewOpener = (selection: PreviewSelection) => void

export type PreviewLoader = (selection: PreviewSelection, signal: AbortSignal) => Promise<ReadEntryResponse>

/**
 * 预览的展示态：只记当前高亮的命中，内容由右侧栏的预览 tab 自己加载。
 * Host 返回的数据仍是唯一真相，这里只保存短暂展示态。
 */
export type PreviewController = {
  getSelection: () => PreviewSelection | null
  subscribe: (listener: () => void) => () => void
  select: (selection: PreviewSelection) => void
  clear: () => void
  /** 预览 tab 卸载或改看别处时回收高亮；只清理与自己一致的选择。 */
  release: (selection: PreviewSelection) => void
  dispose: () => void
}

export function createPreviewController(openPreview: PreviewOpener): PreviewController {
  let selection: PreviewSelection | null = null
  const listeners = new Set<() => void>()

  const publish = (next: PreviewSelection | null) => {
    selection = next
    for (const listener of listeners) listener()
  }

  return {
    getSelection: () => selection,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    select: (next) => {
      publish(next)
      openPreview(next)
    },
    clear: () => publish(null),
    release: (own) => {
      const current = selection
      if (current && current.kbId === own.kbId && isSamePreviewHit(current.hit, own.hit)) publish(null)
    },
    dispose: () => {
      listeners.clear()
      selection = null
    },
  }
}

export function usePreviewSelection(preview: PreviewController): SearchHit | null {
  const [selected, setSelected] = useState<SearchHit | null>(() => preview.getSelection()?.hit ?? null)

  useEffect(() => preview.subscribe(() => {
    setSelected(preview.getSelection()?.hit ?? null)
  }), [preview])

  return selected
}
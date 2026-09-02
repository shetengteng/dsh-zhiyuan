import { useEffect, useState } from 'react'
import type { SearchHit } from '../models.ts'

export type PreviewLayout = {
  openDetails: () => void
  closeDetails: () => void
}

export type PreviewController = {
  getSelected: () => SearchHit | null
  subscribe: (listener: () => void) => () => void
  select: (hit: SearchHit, trigger?: HTMLElement) => void
  clear: () => void
  activateSession: (sessionId?: string) => void
}

export function createPreviewController(layout: PreviewLayout): PreviewController {
  let selected: SearchHit | null = null
  let trigger: HTMLElement | null = null
  let activeSessionId: string | undefined
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  return {
    getSelected: () => selected,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    select: (hit, nextTrigger) => {
      selected = hit
      trigger = nextTrigger ?? null
      notify()
      layout.openDetails()
    },
    clear: () => {
      const lastTrigger = trigger
      selected = null
      trigger = null
      notify()
      layout.closeDetails()
      lastTrigger?.focus()
    },
    activateSession: (sessionId) => {
      if (!sessionId || !activeSessionId || activeSessionId === sessionId) {
        activeSessionId = sessionId ?? activeSessionId
        return
      }
      activeSessionId = sessionId
      selected = null
      trigger = null
      notify()
      layout.closeDetails()
    },
  }
}

export function usePreviewSelection(preview: PreviewController): SearchHit | null {
  const [selected, setSelected] = useState<SearchHit | null>(() => preview.getSelected())

  useEffect(() => preview.subscribe(() => setSelected(preview.getSelected())), [preview])

  return selected
}

export function isSamePreviewHit(left: SearchHit | null, right: SearchHit): boolean {
  return left?.n === right.n
    && left.path === right.path
    && left.startLine === right.startLine
    && left.endLine === right.endLine
    && left.matchLine === right.matchLine
}

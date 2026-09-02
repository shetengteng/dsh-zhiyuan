import { useEffect, useState } from 'react'
import type { SearchHit } from '../models.ts'

export type PreviewLayout = {
  openDetails: () => void
  closeDetails: () => void
}

export type PreviewState = {
  selected: SearchHit | null
  text: string | null
  complete: boolean
}

export type PreviewController = {
  getState: () => PreviewState
  subscribe: (listener: () => void) => () => void
  select: (hit: SearchHit, trigger?: HTMLElement, fullText?: string) => void
  clear: () => void
  activateSession: (sessionId?: string) => void
}

export function createPreviewController(layout: PreviewLayout): PreviewController {
  let selected: SearchHit | null = null
  let text: string | null = null
  let complete = false
  let trigger: HTMLElement | null = null
  let activeSessionId: string | undefined
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const getState = (): PreviewState => ({ selected, text, complete })

  return {
    getState,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    select: (hit, nextTrigger, fullText) => {
      selected = hit
      text = typeof fullText === 'string' ? fullText : null
      complete = typeof fullText === 'string'
      trigger = nextTrigger ?? null
      notify()
      layout.openDetails()
    },
    clear: () => {
      const lastTrigger = trigger
      selected = null
      text = null
      complete = false
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
      text = null
      complete = false
      trigger = null
      notify()
      layout.closeDetails()
    },
  }
}

export function usePreviewSelection(preview: PreviewController): SearchHit | null {
  return usePreviewState(preview).selected
}

export function usePreviewState(preview: PreviewController): PreviewState {
  const [state, setState] = useState<PreviewState>(() => preview.getState())

  useEffect(() => preview.subscribe(() => setState(preview.getState())), [preview])

  return state
}

export function isSamePreviewHit(left: SearchHit | null, right: SearchHit): boolean {
  return left?.n === right.n
    && left.path === right.path
    && left.startLine === right.startLine
    && left.endLine === right.endLine
    && left.matchLine === right.matchLine
}

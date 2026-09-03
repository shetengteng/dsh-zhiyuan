import { useEffect, useState } from 'react'
import type { ReadEntryResult, SearchHit } from '../models.ts'

export type PreviewLayout = {
  openDetails: () => void
  closeDetails: () => void
}

export type PreviewSelection = {
  baseId: string
  hit: SearchHit
}

export type PreviewLoader = (selection: PreviewSelection, signal: AbortSignal) => Promise<ReadEntryResult>

export type PreviewState = {
  selected: SearchHit | null
  preview: ReadEntryResult | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string
}

export type PreviewController = {
  getState: () => PreviewState
  subscribe: (listener: () => void) => () => void
  select: (selection: PreviewSelection, trigger?: HTMLElement) => void
  clear: () => void
  activateSession: (sessionId?: string) => void
  dispose: () => void
}

export function createPreviewController(layout: PreviewLayout, loadPreview: PreviewLoader): PreviewController {
  let selected: SearchHit | null = null
  let preview: ReadEntryResult | null = null
  let status: PreviewState['status'] = 'idle'
  let error = ''
  let trigger: HTMLElement | null = null
  let activeSessionId: string | undefined
  let requestId = 0
  let requestController: AbortController | undefined
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const getState = (): PreviewState => ({ selected, preview, status, error })

  const cancelRequest = () => {
    requestId += 1
    requestController?.abort()
    requestController = undefined
  }

  const reset = () => {
    cancelRequest()
    selected = null
    preview = null
    status = 'idle'
    error = ''
    trigger = null
  }

  return {
    getState,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    select: (selection, nextTrigger) => {
      cancelRequest()
      const currentRequestId = requestId
      selected = selection.hit
      preview = null
      status = 'loading'
      error = ''
      trigger = nextTrigger ?? null
      notify()
      layout.openDetails()
      requestController = new AbortController()
      void loadPreview(selection, requestController.signal).then((value) => {
        if (currentRequestId !== requestId) return
        preview = value
        status = 'ready'
        requestController = undefined
        notify()
      }).catch((reason: unknown) => {
        if (currentRequestId !== requestId) return
        requestController = undefined
        if (isAbortReason(reason)) return
        status = 'error'
        error = reason instanceof Error ? reason.message : '预览加载失败'
        notify()
      })
    },
    clear: () => {
      const lastTrigger = trigger
      reset()
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
      reset()
      notify()
      layout.closeDetails()
    },
    dispose: () => {
      cancelRequest()
      listeners.clear()
      trigger = null
    },
  }
}

function isAbortReason(reason: unknown): boolean {
  return Boolean(reason && typeof reason === 'object' && (reason as { name?: unknown }).name === 'AbortError')
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

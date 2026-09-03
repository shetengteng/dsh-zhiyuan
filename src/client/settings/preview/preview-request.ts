export type PreviewRequest = {
  id: number
  signal: AbortSignal
}

export type PreviewRequestManager = {
  start: () => PreviewRequest
  isCurrent: (requestId: number) => boolean
  clear: (requestId: number) => void
  cancel: () => void
}

export function createPreviewRequestManager(): PreviewRequestManager {
  let currentId = 0
  let controller: AbortController | undefined

  return {
    start: () => {
      controller?.abort()
      currentId += 1
      controller = new AbortController()
      return { id: currentId, signal: controller.signal }
    },
    isCurrent: (requestId) => requestId === currentId,
    clear: (requestId) => {
      if (requestId === currentId) controller = undefined
    },
    cancel: () => {
      controller?.abort()
      controller = undefined
      currentId += 1
    },
  }
}

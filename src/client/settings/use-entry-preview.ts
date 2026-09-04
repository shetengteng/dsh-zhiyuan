import { useEffect, useRef, useState } from 'react'
import type { ReadEntryResult, SearchHit } from '../models.ts'
import { parseReadEntry } from '../host-payload.ts'
import { createPreviewRequestManager } from './preview/preview-request.ts'

type EntryPreviewOptions = {
  call: (payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>
  onOpened: () => void
  onTreeError: (message: string) => void
  onSearchError: (message: string) => void
}

/** 条目预览 hook：从树或搜索命中打开预览，管理请求取消与过期结果丢弃。 */
export function useEntryPreview(options: EntryPreviewOptions) {
  const [preview, setPreview] = useState<ReadEntryResult | null>(null)
  const [previewFallback, setPreviewFallback] = useState('')
  const [previewOrigin, setPreviewOrigin] = useState('tree' as 'tree' | 'search')
  const previewRequests = useRef(createPreviewRequestManager())

  useEffect(() => () => previewRequests.current.cancel(), [])

  const openTreeEntry = (baseId: string, entryPath: string) => {
    const request = previewRequests.current.start()
    void options.call({ op: 'read', id: baseId, path: entryPath, view: 'tree', readMode: 'edit' }, request.signal).then((value) => {
      if (!previewRequests.current.isCurrent(request.id)) return
      setPreview(parseReadEntry(value))
      setPreviewFallback('')
      setPreviewOrigin('tree')
      options.onOpened()
    }).catch((err) => {
      if (previewRequests.current.isCurrent(request.id) && !request.signal.aborted) options.onTreeError(err instanceof Error ? err.message : String(err))
    }).finally(() => {
      previewRequests.current.clear(request.id)
    })
  }

  const openSearchHit = (baseId: string, hit: SearchHit) => {
    const request = previewRequests.current.start()
    void options.call({
      op: 'read',
      id: baseId,
      path: hit.path,
      view: 'search-hit',
      matchLine: hit.matchLine,
      matchColumnByte: hit.matchColumnByte,
      sourceFingerprint: hit.sourceFingerprint,
    }, request.signal).then((value) => {
      if (!previewRequests.current.isCurrent(request.id)) return
      setPreview(parseReadEntry(value, { view: 'search-hit', matchLine: hit.matchLine }))
      setPreviewFallback(hit.excerpt)
      setPreviewOrigin('search')
      options.onOpened()
    }).catch((err) => {
      if (previewRequests.current.isCurrent(request.id) && !request.signal.aborted) options.onSearchError(err instanceof Error ? err.message : String(err))
    }).finally(() => {
      previewRequests.current.clear(request.id)
    })
  }

  const cancelPreviews = () => previewRequests.current.cancel()

  return { preview, previewFallback, previewOrigin, openTreeEntry, openSearchHit, cancelPreviews }
}

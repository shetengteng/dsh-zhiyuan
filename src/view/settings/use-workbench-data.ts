import { useEffect, useRef, useState } from 'react'
import { callKnowledgeHost, getKnowledgeJobStatus, type KnowledgePrivateConnection } from '../bridge.ts'
import { parseKbList, parseKbTree } from '../payload/kb-result.ts'
import { parseCatalogPrefs, parseJobStatusResponse } from '../payload/settings-response.ts'
import type { KbSummaryResponse, JobStatusResponse, CatalogPrefs, KbTreeNodeResponse } from '../types.ts'

const DEFAULT_PREFS: CatalogPrefs = { defaultKbId: '', maxFileBytes: 5_242_880, maxKbBytes: 10_737_418_240 }

export type WorkbenchNotice = {
  tone: 'success' | 'warning' | 'error'
  text: string
}

/** 把弹框里输入的别名文本按中英文逗号拆成数组。 */
export function splitAliases(text: string): string[] {
  return text.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
}

/** 刷新后仍选当前库；该库已不在列表中（例如刚删除）则回退到上次使用或第一项。 */
export function pickWorkbenchKbId(list: KbSummaryResponse[], preferredId: string): string {
  if (preferredId && list.some((item) => item.id === preferredId)) return preferredId
  return list.find((item) => item.lastUsed)?.id || list[0]?.id || ''
}

/** 工作台数据 hook：库列表、当前库、目录树、偏好与任务状态；Host 是唯一真相。 */
export function useWorkbenchData(connection?: KnowledgePrivateConnection) {
  const [kbs, setKbs] = useState([] as KbSummaryResponse[])
  const [currentKbId, setCurrentKbId] = useState('')
  const [tree, setTree] = useState([] as KbTreeNodeResponse[])
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [job, setJob] = useState(undefined as JobStatusResponse | undefined)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<WorkbenchNotice | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const call = (payload: Record<string, unknown>, signal?: AbortSignal) => callKnowledgeHost(connection, payload, signal)

  const refresh = async (selectedKbId?: string) => {
    setPending(true)
    setNotice(null)
    try {
      const list = parseKbList(await call({ op: 'list' }))
      if (!mountedRef.current) return
      setKbs(list)
      const nextKbId = pickWorkbenchKbId(list, selectedKbId || currentKbId)
      setCurrentKbId(nextKbId)
      const nextTree = nextKbId ? parseKbTree(await call({ op: 'tree', id: nextKbId })) : []
      if (!mountedRef.current) return
      setTree(nextTree)
      const nextPrefs = parseCatalogPrefs(await call({ op: 'prefs' }))
      if (!mountedRef.current) return
      setPrefs(nextPrefs)
      const nextJob = parseJobStatusResponse(await getKnowledgeJobStatus(connection))
      if (!mountedRef.current) return
      setJob(nextJob)
    } catch (err) {
      if (mountedRef.current) {
        setTree([])
        setNotice({ tone: 'error', text: err instanceof Error ? err.message : String(err) })
      }
    } finally {
      if (mountedRef.current) setPending(false)
    }
  }

  const run = async <T,>(work: () => Promise<T>, options?: { onSuccess?: () => void; after?: (value: T) => void }) => {
    setError('')
    setPending(true)
    try {
      const value = await work()
      if (!mountedRef.current) return
      options?.onSuccess?.()
      await refresh(currentKbId)
      if (!mountedRef.current) return
      options?.after?.(value)
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (mountedRef.current) setPending(false)
    }
  }

  return { kbs, currentKbId, setCurrentKbId, tree, prefs, job, pending, error, notice, setError, setNotice, call, refresh, run }
}

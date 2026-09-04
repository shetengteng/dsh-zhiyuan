import { useState } from 'react'
import { callKnowledgeHost, getKnowledgeJobStatus, type KnowledgePrivateConnection } from '../bridge.ts'
import type { BaseSummary, JobStatus, Prefs, TreeNode } from '../models.ts'

const DEFAULT_PREFS: Prefs = { defaultBaseId: '', maxFileBytes: 5_242_880, maxBaseBytes: 10_737_418_240 }

/** 把弹框里输入的别名文本按中英文逗号拆成数组。 */
export function splitAliases(text: string): string[] {
  return text.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
}

/** 刷新后仍选当前库；该库已不在列表中（例如刚删除）则回退到上次使用或第一项。 */
export function pickWorkbenchBaseId(list: BaseSummary[], preferredId: string): string {
  if (preferredId && list.some((item) => item.id === preferredId)) return preferredId
  return list.find((item) => item.lastUsed)?.id || list[0]?.id || ''
}

/** 工作台数据 hook：库列表、当前库、目录树、偏好与任务状态；Host 是唯一真相。 */
export function useWorkbenchData(connection?: KnowledgePrivateConnection) {
  const [bases, setBases] = useState([] as BaseSummary[])
  const [currentBaseId, setCurrentBaseId] = useState('')
  const [tree, setTree] = useState([] as TreeNode[])
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [job, setJob] = useState(undefined as JobStatus | undefined)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const call = (payload: Record<string, unknown>, signal?: AbortSignal) => callKnowledgeHost(connection, payload, signal)

  const refresh = async (baseId?: string) => {
    setPending(true)
    setNote('')
    try {
      const list = await call({ op: 'list' }) as BaseSummary[]
      setBases(list)
      const nextBaseId = pickWorkbenchBaseId(list, baseId || currentBaseId)
      setCurrentBaseId(nextBaseId)
      if (nextBaseId) setTree(await call({ op: 'tree', id: nextBaseId }) as TreeNode[])
      else setTree([])
      setPrefs(await call({ op: 'prefs' }) as Prefs)
      setJob(await getKnowledgeJobStatus(connection) as JobStatus)
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  const run = async <T,>(work: () => Promise<T>, options?: { onSuccess?: () => void; after?: (value: T) => void }) => {
    setError('')
    setPending(true)
    try {
      const value = await work()
      options?.onSuccess?.()
      await refresh(currentBaseId)
      options?.after?.(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return { bases, currentBaseId, setCurrentBaseId, tree, prefs, job, pending, error, note, setError, setNote, call, refresh, run }
}

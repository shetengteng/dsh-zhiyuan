import type { CatalogPrefs } from '../../model/value/catalog-prefs.ts'
import type { JobStatusResponse } from '../../model/response/job-response.ts'
import type { OperationAckResponse, PickSourceResponse } from '../../model/response/operation-response.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** 收窄 Host 返回的持久化偏好值。 */
export function parseCatalogPrefs(value: unknown): CatalogPrefs {
  const prefs = asRecord(value)
  if (!prefs || typeof prefs.defaultKbId !== 'string'
    || !isPositiveInteger(prefs.maxFileBytes) || !isPositiveInteger(prefs.maxKbBytes)) {
    throw new Error('Host 返回的偏好设置无效')
  }
  return value as CatalogPrefs
}

/** 收窄 Host 任务队列的状态投影。 */
export function parseJobStatusResponse(value: unknown): JobStatusResponse {
  const status = asRecord(value)
  if (!status || typeof status.running !== 'boolean'
    || (status.op !== undefined && typeof status.op !== 'string')
    || !Array.isArray(status.failed)
    || !status.failed.every((item) => {
      const failure = asRecord(item)
      return Boolean(failure && typeof failure.op === 'string' && typeof failure.message === 'string'
        && typeof failure.at === 'number' && Number.isFinite(failure.at) && failure.at >= 0)
    })) {
    throw new Error('Host 返回的任务状态无效')
  }
  return value as JobStatusResponse
}

/** 收窄系统选择器结果，明确区分取消和成功选取。 */
export function parsePickSourceResult(value: unknown): PickSourceResponse {
  const result = asRecord(value)
  if (result && typeof result.path === 'string' && result.path) return value as PickSourceResponse
  if (result?.cancelled === true) return value as PickSourceResponse
  throw new Error('Host 返回的选择文件结果无效')
}

/** 确认 Host 已完成无返回值的写入或删除 operation。 */
export function parseOperationAck(value: unknown): OperationAckResponse {
  const result = asRecord(value)
  if (!result || result.ok !== true) throw new Error('Host 未确认操作完成')
  return value as OperationAckResponse
}

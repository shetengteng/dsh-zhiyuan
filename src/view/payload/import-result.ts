import type { ImportProgress, ImportResponse } from '../view-models.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** 收窄 Host 导入结果，保留文件级失败信息供工作台展示。 */
export function parseImportResponse(value: unknown): ImportResponse {
  const result = asRecord(value)
  if (!result || typeof result.kbId !== 'string' || !Array.isArray(result.copied) || !Array.isArray(result.renamed)
    || typeof result.skipped !== 'number' || typeof result.failed !== 'number' || !Array.isArray(result.createdDirs)
    || !Array.isArray(result.files) || !Array.isArray(result.warnings)) {
    throw new Error('Host 返回的导入结果无效')
  }
  return value as ImportResponse
}

/**
 * 从任务状态投影里提取导入进度快照；非导入任务、无进度或字段不完整时返回 null，
 * 进度展示是尽力而为的附加信息，收窄失败按没有进度处理。
 */
export function extractImportProgress(status: unknown): ImportProgress | null {
  const record = asRecord(status)
  if (!record || record.op !== 'import') return null
  const progress = record.progress
  const shape = asRecord(progress)
  if (!shape || typeof shape.total !== 'number' || !Number.isFinite(shape.total)
    || typeof shape.processed !== 'number' || !Number.isFinite(shape.processed)
    || !Array.isArray(shape.files)) {
    return null
  }
  return progress as ImportProgress
}

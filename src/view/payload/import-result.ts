import type { ImportResult } from '../types.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** 收窄 Host 导入结果，保留文件级失败信息供工作台展示。 */
export function parseImportResult(value: unknown): ImportResult {
  const result = asRecord(value)
  if (!result || typeof result.baseId !== 'string' || !Array.isArray(result.copied) || !Array.isArray(result.renamed)
    || typeof result.skipped !== 'number' || typeof result.failed !== 'number' || !Array.isArray(result.createdDirs)
    || !Array.isArray(result.files) || !Array.isArray(result.warnings)) {
    throw new Error('Host 返回的导入结果无效')
  }
  return value as ImportResult
}

import { isAbsolute } from 'node:path'

/** XLSX 转换请求：只含可序列化基本值，由注册模块硬编码构造、子进程复验。 */
export type XlsxConvertRequest = {
  kind: 'convert-xlsx'
  sourcePath: string
  /** 源文件名去掉 .xlsx 后的产物名片段；不含路径分隔符，非空。 */
  outputStem: string
  maxSourceBytes: number
  maxOutputBytes: number
  maxSheets: number
  maxSheetRows: number
  maxSheetCols: number
}

export function isXlsxConvertRequest(value: unknown): value is XlsxConvertRequest {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (record.kind !== 'convert-xlsx') return false
  if (typeof record.sourcePath !== 'string' || !isAbsolute(record.sourcePath)) return false
  if (typeof record.outputStem !== 'string' || !record.outputStem) return false
  if (record.outputStem.includes('/') || record.outputStem.includes('\\')) return false
  for (const key of ['maxSourceBytes', 'maxOutputBytes', 'maxSheets', 'maxSheetRows', 'maxSheetCols']) {
    const limit = record[key]
    if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit <= 0) return false
  }
  return true
}

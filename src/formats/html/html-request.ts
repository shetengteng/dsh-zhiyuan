import { isAbsolute } from 'node:path'

/** HTML 转换请求：只含可序列化基本值，由注册模块硬编码构造、子进程复验。 */
export type HtmlConvertRequest = {
  kind: 'convert-html'
  sourcePath: string
  outputName: string
  maxSourceBytes: number
  maxOutputBytes: number
}

export function isHtmlConvertRequest(value: unknown): value is HtmlConvertRequest {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (record.kind !== 'convert-html') return false
  if (typeof record.sourcePath !== 'string' || !isAbsolute(record.sourcePath)) return false
  if (typeof record.outputName !== 'string' || !record.outputName.endsWith('.md')) return false
  if (record.outputName.includes('/') || record.outputName.includes('\\')) return false
  if (typeof record.maxSourceBytes !== 'number' || !Number.isSafeInteger(record.maxSourceBytes) || record.maxSourceBytes <= 0) return false
  if (typeof record.maxOutputBytes !== 'number' || !Number.isSafeInteger(record.maxOutputBytes) || record.maxOutputBytes <= 0) return false
  return true
}

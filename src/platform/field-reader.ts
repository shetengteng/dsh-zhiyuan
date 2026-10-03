/** 请求字段收窄共享原语：Tool 与 RPC 渠道共用的基础读取器。 */
import { KbError } from '../model/error/kb-error.ts'

export type JsonRecord = Record<string, unknown>

export function hasField(data: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

/** 严格收窄：非法输入抛 invalid_field（RPC 渠道边界）。 */
export function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new KbError('invalid_field', '请求参数必须是对象')
  }
  return value as JsonRecord
}

/** 宽松收窄：非法输入返回空记录，由各字段默认值兜底（Tool 渠道边界）。 */
export function asLooseRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

export function requireString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (value === undefined) throw new KbError('missing_field', `${field} 必填`)
  if (typeof value !== 'string') throw new KbError('invalid_field', `${field} 必须是字符串`)
  return value
}

/** Tool 渠道：非字符串或空白字符串都视同缺参。 */
export function requireNonEmptyString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (typeof value !== 'string' || !value.trim()) throw new KbError('missing_field', `${field} 必填`)
  return value
}

export function optionalString(data: JsonRecord, field: string): string | undefined {
  if (!hasField(data, field)) return undefined
  return requireString(data, field)
}

export function optionalNumber(data: JsonRecord, field: string): number | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (typeof value !== 'number') throw new KbError('invalid_field', `${field} 必须是数字`)
  return value
}

export function optionalStringArray(data: JsonRecord, field: string): string[] | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new KbError('invalid_field', `${field} 必须是字符串数组`)
  }
  return value
}

export function optionalBoolean(data: JsonRecord, field: string, fallback: boolean): boolean {
  if (!hasField(data, field)) return fallback
  const value = data[field]
  if (typeof value !== 'boolean') throw new KbError('invalid_field', `${field} 必须是布尔值`)
  return value
}

/** Tool 渠道宽松布尔：非法值直接回退默认，不报错。 */
export function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function optionalPositiveInteger(data: JsonRecord, field: string): number | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError('invalid_field', `${field} 必须是正整数`)
  }
  return value
}

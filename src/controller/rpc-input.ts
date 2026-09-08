import { EntryPreviewView, EntryReadMode, isEntryPreviewView, isEntryReadMode, type EntryPreviewOptions } from '../content/host-api.ts'
import { KbError } from '../model/types.ts'

export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new KbError('invalid_field', '请求参数必须是对象')
  }
  return value as JsonRecord
}

export function hasField(data: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

export function requireString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (value === undefined) throw new KbError('missing_field', `${field} 必填`)
  if (typeof value !== 'string') throw new KbError('invalid_field', `${field} 必须是字符串`)
  return value
}

export function optionalString(data: JsonRecord, field: string): string | undefined {
  if (!hasField(data, field)) return undefined
  return requireString(data, field)
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

export function optionalPositiveInteger(data: JsonRecord, field: string): number | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError('invalid_field', `${field} 必须是正整数`)
  }
  return value
}

export function readPreviewOptions(data: JsonRecord): EntryPreviewOptions {
  const readMode = hasField(data, 'readMode') ? data.readMode : EntryReadMode.Preview
  if (!isEntryReadMode(readMode)) throw new KbError('invalid_preview', '读取模式无效')
  if (!hasField(data, 'view')) return { readMode }
  if (!isEntryPreviewView(data.view)) throw new KbError('invalid_preview', '预览模式无效')
  if (data.view === EntryPreviewView.Tree) return { view: data.view, readMode }
  if (readMode === EntryReadMode.Edit) throw new KbError('invalid_preview', '搜索命中不能进入编辑模式')
  const matchLine = optionalPositiveInteger(data, 'matchLine')
  if (matchLine === undefined) throw new KbError('invalid_preview', '搜索预览缺少有效命中行')
  const matchColumnByte = optionalPositiveInteger(data, 'matchColumnByte')
  const sourceFingerprint = optionalString(data, 'sourceFingerprint')
  if (sourceFingerprint !== undefined && sourceFingerprint.length > 128) {
    throw new KbError('invalid_preview', '搜索预览文件指纹无效')
  }
  return { view: data.view, readMode, matchLine, matchColumnByte, sourceFingerprint }
}

import type { ImportInput } from '../model/types.ts'
import { KbError } from '../model/types.ts'
import type { SearchRequest } from '../service/search/index.ts'

export type JsonRecord = Record<string, unknown>

export function asToolRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

export function requireToolString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (typeof value !== 'string' || !value.trim()) throw new KbError('missing_field', `${field} 必填`)
  return value
}

export function optionalToolString(data: JsonRecord, field: string): string | undefined {
  const value = data[field]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new KbError('invalid_field', `${field} 必须是字符串`)
  return value
}

export function optionalToolNumber(data: JsonRecord, field: string): number | undefined {
  const value = data[field]
  if (value === undefined) return undefined
  if (typeof value !== 'number') throw new KbError('invalid_field', `${field} 必须是数字`)
  return value
}

export function optionalToolBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function optionalToolStringArray(data: JsonRecord, field: string): string[] | undefined {
  const value = data[field]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new KbError('invalid_field', `${field} 必须是字符串数组`)
  }
  return value
}

export function buildToolImportInput(data: JsonRecord): ImportInput {
  return {
    baseId: requireToolString(data, 'baseId'),
    sourcePath: requireToolString(data, 'sourcePath'),
    destCategory: typeof data.destCategory === 'string' ? data.destCategory : '',
    preserveTree: optionalToolBoolean(data.preserveTree, false),
    createMissing: optionalToolBoolean(data.createMissing, true),
    onConflict: 'skip',
  }
}

export function buildToolSearchRequest(data: JsonRecord): SearchRequest {
  const limit = optionalToolNumber(data, 'limit')
  if (data.cursor !== undefined) {
    return {
      cursor: requireToolString(data, 'cursor'),
      ...(limit === undefined ? {} : { limit }),
    }
  }
  return {
    baseId: requireToolString(data, 'baseId'),
    query: requireToolString(data, 'query'),
    aliases: optionalToolStringArray(data, 'aliases'),
    category: optionalToolString(data, 'category'),
    path: optionalToolString(data, 'path'),
    ...(limit === undefined ? {} : { limit }),
  }
}

import { KbError } from '../../model/error/kb-error.ts'
import { createImportFromPathRequest, type ImportFromPathRequest } from '../../model/request/import-request.ts'
import type { SearchRequest } from '../../model/request/search-request.ts'

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

/** 保留 Tool 的宽松原始字段回退，再映射到路径导入应用请求。 */
export function buildToolImportInput(data: JsonRecord): ImportFromPathRequest {
  return createImportFromPathRequest({
    kbId: requireToolString(data, 'kbId'),
    sourcePath: requireToolString(data, 'sourcePath'),
    destCategory: typeof data.destCategory === 'string' ? data.destCategory : '',
    preserveTree: optionalToolBoolean(data.preserveTree, false),
    createMissing: optionalToolBoolean(data.createMissing, true),
  })
}

/** 保留 Tool 的字段收窄规则，再映射到检索应用请求。 */
export function buildToolSearchRequest(data: JsonRecord): SearchRequest {
  const limit = optionalToolNumber(data, 'limit')
  if (data.cursor !== undefined) {
    if (['kbId', 'query', 'aliases', 'category', 'path'].some((field) => Object.prototype.hasOwnProperty.call(data, field))) {
      throw new KbError('invalid_field', '续页请求只能包含 cursor 和 limit')
    }
    return {
      cursor: requireToolString(data, 'cursor'),
      ...(limit === undefined ? {} : { limit }),
    }
  }
  return {
    kbId: requireToolString(data, 'kbId'),
    query: requireToolString(data, 'query'),
    aliases: optionalToolStringArray(data, 'aliases'),
    category: optionalToolString(data, 'category'),
    path: optionalToolString(data, 'path'),
    ...(limit === undefined ? {} : { limit }),
  }
}

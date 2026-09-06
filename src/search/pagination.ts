import { SEARCH_CURSOR_MAX_LENGTH } from '../identity.ts'
import { KbError } from '../types.ts'
import type { SearchQuery } from './result/result-shared.ts'

export type SearchCursorQuery = {
  baseId: string
  terms: string[]
  aliases: string[]
  category?: string
  path?: string
}

export type SearchCursorPayload =
  | {
      version: 3
      scope: 'files'
      query: Omit<SearchCursorQuery, 'path'>
      position: { fileIndex: number }
    }
  | {
      version: 3
      scope: 'hits'
      query: SearchCursorQuery & { path: string }
      position: { hitIndex: number }
    }

export function encodeSearchCursor(payload: SearchCursorPayload): string {
  if (!isValidPayload(payload)) throw new KbError('invalid_field', '搜索游标位置无效')
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  if (encoded.length > SEARCH_CURSOR_MAX_LENGTH) throw new KbError('invalid_field', '搜索游标过长')
  return encoded
}

export function decodeSearchCursor(cursor: string): SearchCursorPayload {
  if (!cursor || cursor.length > SEARCH_CURSOR_MAX_LENGTH || !/^[A-Za-z0-9_-]+$/u.test(cursor)) {
    throw new KbError('invalid_field', '搜索游标无效或已过期')
  }
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const value: unknown = JSON.parse(decoded)
    if (!isValidPayload(value)) throw new Error('invalid cursor')
    return value
  } catch {
    throw new KbError('invalid_field', '搜索游标无效或已过期')
  }
}

export function cursorQueryFromSearch(query: SearchQuery, baseId: string, category?: string, path?: string): SearchCursorQuery {
  return {
    baseId,
    terms: [...query.terms],
    aliases: [...query.aliases],
    ...(category ? { category } : {}),
    ...(path ? { path } : {}),
  }
}

function isValidPayload(value: unknown): value is SearchCursorPayload {
  const record = asRecord(value)
  if (!record || record.version !== 3 || (record.scope !== 'files' && record.scope !== 'hits')) return false
  const query = asRecord(record.query)
  if (!query || typeof query.baseId !== 'string' || !query.baseId.trim()
    || !isStringArray(query.terms) || !query.terms.length || !isStringArray(query.aliases)) return false
  if (query.category !== undefined && (typeof query.category !== 'string' || !query.category.trim())) return false
  if (record.scope === 'files') {
    if (query.path !== undefined) return false
    const position = asRecord(record.position)
    return position !== null && isNonNegativeInteger(position.fileIndex)
      && Object.keys(position).every((key) => key === 'fileIndex')
  }
  if (typeof query.path !== 'string' || !query.path.trim()) return false
  const position = asRecord(record.position)
  return position !== null && isNonNegativeInteger(position.hitIndex)
    && Object.keys(position).every((key) => key === 'hitIndex')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && Boolean(item.trim()))
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

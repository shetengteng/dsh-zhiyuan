import { createHash } from 'node:crypto'
import type { SearchPagePosition } from './types.ts'
import { KbError } from './types.ts'

type SearchCursorPayload = {
  version: 2
  fileIndex: number
  hitIndex: number
  queryKey: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** 为一次搜索生成稳定的分页身份，避免把别的查询游标混进来；明细档把 path 纳入指纹。 */
export function searchQueryKey(input: { baseId: string; rootDir: string; terms: string[]; path?: string }): string {
  return createHash('sha256')
    .update(JSON.stringify({ baseId: input.baseId, rootDir: input.rootDir, terms: input.terms, path: input.path ?? null }))
    .digest('hex')
}

export function encodeSearchCursor(position: SearchPagePosition, queryKey: string): string {
  if (!Number.isSafeInteger(position.fileIndex) || position.fileIndex < 0
    || !Number.isSafeInteger(position.hitIndex) || position.hitIndex < 0) {
    throw new Error('搜索游标位置无效')
  }
  const payload: SearchCursorPayload = { version: 2, fileIndex: position.fileIndex, hitIndex: position.hitIndex, queryKey }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeSearchCursor(cursor: string, queryKey: string): SearchPagePosition {
  if (cursor.length > 512) throw new KbError('invalid_field', '搜索游标无效或已过期')
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    const payload = asRecord(value)
    const fileIndex = typeof payload?.fileIndex === 'number' ? payload.fileIndex : -1
    const hitIndex = typeof payload?.hitIndex === 'number' ? payload.hitIndex : -1
    if (payload?.version !== 2 || payload.queryKey !== queryKey
      || !Number.isSafeInteger(fileIndex) || fileIndex < 0
      || !Number.isSafeInteger(hitIndex) || hitIndex < 0) {
      throw new Error('搜索游标无效')
    }
    return { fileIndex, hitIndex }
  } catch {
    throw new KbError('invalid_field', '搜索游标无效或已过期')
  }
}

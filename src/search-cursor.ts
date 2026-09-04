import { createHash } from 'node:crypto'
import { KbError } from './types.ts'

type SearchCursorPayload = {
  version: 1
  offset: number
  queryKey: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** 为一次搜索生成稳定的分页身份，避免把别的查询游标混进来。 */
export function searchQueryKey(input: { baseId: string; rootDir: string; terms: string[] }): string {
  return createHash('sha256')
    .update(JSON.stringify({ baseId: input.baseId, rootDir: input.rootDir, terms: input.terms }))
    .digest('hex')
}

export function encodeSearchCursor(offset: number, queryKey: string): string {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('搜索游标位置无效')
  const payload: SearchCursorPayload = { version: 1, offset, queryKey }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeSearchCursor(cursor: string, queryKey: string): number {
  if (cursor.length > 512) throw new KbError('invalid_field', '搜索游标无效或已过期')
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    const payload = asRecord(value)
    if (payload?.version !== 1 || payload.queryKey !== queryKey
      || !Number.isSafeInteger(payload.offset) || payload.offset < 0) {
      throw new Error('搜索游标无效')
    }
    return payload.offset
  } catch {
    throw new KbError('invalid_field', '搜索游标无效或已过期')
  }
}

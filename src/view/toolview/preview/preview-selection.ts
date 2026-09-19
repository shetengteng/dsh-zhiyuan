import type { SearchHit } from '../../types.ts'

/** 一次预览请求：命中所属的知识库与命中本身。 */
export type PreviewSelection = {
  kbId: string
  hit: SearchHit
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isSearchHit(value: unknown): value is SearchHit {
  const hit = asRecord(value)
  if (!hit) return false
  return isInteger(hit.n)
    && typeof hit.path === 'string'
    && isInteger(hit.startLine) && isInteger(hit.endLine) && isInteger(hit.matchLine)
    && typeof hit.excerpt === 'string'
    && isOptionalString(hit.matchedExcerpt)
    && isOptionalString(hit.sourceFingerprint)
    && (hit.matchColumnByte === undefined || isInteger(hit.matchColumnByte))
}

/** 右侧栏导航参数由调用方按 JSON 形状传入、运行时不校验，在边界处收窄。 */
export function parsePreviewSelection(params: unknown): PreviewSelection | null {
  const value = asRecord(params)
  if (!value || typeof value.kbId !== 'string' || !isSearchHit(value.hit)) return null
  return { kbId: value.kbId, hit: value.hit }
}

/** 同一文件里的同一处命中才算同一条预览。 */
export function isSamePreviewHit(left: SearchHit | null, right: SearchHit): boolean {
  return left?.n === right.n
    && left.path === right.path
    && left.startLine === right.startLine
    && left.endLine === right.endLine
    && left.matchLine === right.matchLine
}
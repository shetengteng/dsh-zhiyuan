import {
  MAX_ALIASES,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_PATTERN_LENGTH,
  SEARCH_MAX_PATTERN_TOTAL_LENGTH,
  SEARCH_UNSUPPORTED_PATTERN_MESSAGE,
} from '../../model/constants.ts'
import type { SearchCursorQuery } from '../../model/context/search-pagination-context.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type {
  ContinueSearchRequest,
  InitialSearchRequest,
  NormalizedContinueSearchRequest,
  NormalizedInitialSearchRequest,
  NormalizedSearchRequest,
  SearchRequest,
} from '../../model/request/search-request.ts'
import type { SearchQuery } from '../../model/response/search-response.ts'

export type {
  ContinueSearchRequest,
  InitialSearchRequest,
  NormalizedContinueSearchRequest,
  NormalizedInitialSearchRequest,
  NormalizedSearchRequest,
  SearchRequest,
} from '../../model/request/search-request.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) throw new KbError('missing_field', `${key} 必填`)
  return value.trim()
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (!hasOwn(record, key) || value === undefined) return undefined
  if (typeof value !== 'string') throw new KbError('invalid_field', `${key} 必须是字符串`)
  return value
}

export function normalizeSearchLimit(value: unknown): number {
  if (value === undefined) return SEARCH_DEFAULT_LIMIT
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > SEARCH_MAX_LIMIT) {
    throw new KbError('invalid_field', `limit 必须是 1 到 ${SEARCH_MAX_LIMIT} 之间的整数`)
  }
  return value
}

export function normalizeSearchPatterns(query: unknown, aliases: unknown): SearchQuery {
  if (typeof query !== 'string' || !query.trim()) throw new KbError('missing_field', 'query 必填')
  if (aliases !== undefined && (!Array.isArray(aliases) || aliases.some((item) => typeof item !== 'string'))) {
    throw new KbError('invalid_field', 'aliases 必须是字符串数组')
  }
  const normalizedQuery = query.trim()
  const rawAliases = (aliases as string[] | undefined) ?? []
  if (rawAliases.length > MAX_ALIASES) throw new KbError('invalid_field', `aliases 不能超过 ${MAX_ALIASES} 个`)
  const normalizedAliases: string[] = []
  const seen = new Set<string>([normalizedQuery])
  for (const rawAlias of rawAliases) {
    const alias = rawAlias.trim()
    if (!alias) throw new KbError('invalid_field', 'aliases 不能包含空正则')
    validatePattern(alias)
    if (!seen.has(alias)) {
      seen.add(alias)
      normalizedAliases.push(alias)
    }
  }
  validatePattern(normalizedQuery)
  const terms = [normalizedQuery, ...normalizedAliases]
  const totalLength = terms.reduce((sum, term) => sum + term.length, 0)
  if (totalLength > SEARCH_MAX_PATTERN_TOTAL_LENGTH) {
    throw new KbError('invalid_field', `正则表达式总长度不能超过 ${SEARCH_MAX_PATTERN_TOTAL_LENGTH}`)
  }
  return { terms, aliases: normalizedAliases }
}

export function normalizeCursorQuery(query: SearchCursorQuery): SearchQuery {
  if (!query || typeof query !== 'object' || !Array.isArray(query.terms) || !Array.isArray(query.aliases)) {
    throw new KbError('invalid_field', '搜索游标中的查询条件无效')
  }
  if (!query.terms.length || query.terms.some((term) => typeof term !== 'string' || !term.trim())) {
    throw new KbError('invalid_field', '搜索游标中的正则表达式无效')
  }
  const normalizedTerms = query.terms.map((term) => term.trim())
  const normalizedAliases = query.aliases.map((alias) => alias.trim())
  if (normalizedTerms.length !== normalizedAliases.length + 1 || normalizedTerms[0] !== normalizedTerms[0].trim()) {
    throw new KbError('invalid_field', '搜索游标中的查询条件无效')
  }
  const normalized = normalizeSearchPatterns(normalizedTerms[0], normalizedAliases)
  if (normalized.terms.length !== normalizedTerms.length || normalized.terms.some((term, index) => term !== normalizedTerms[index])) {
    throw new KbError('invalid_field', '搜索游标中的查询条件无效')
  }
  return normalized
}

export function normalizeSearchRequest(input: SearchRequest): NormalizedSearchRequest {
  const record = asRecord(input)
  if (!record) throw new KbError('invalid_field', '搜索请求必须是对象')
  const cursorValue = record.cursor
  if (cursorValue !== undefined) {
    if (typeof cursorValue !== 'string' || !cursorValue.trim()) throw new KbError('invalid_field', 'cursor 必须是非空字符串')
    if (['kbId', 'query', 'aliases', 'category', 'path'].some((key) => hasOwn(record, key))) {
      throw new KbError('invalid_field', '续页请求只能包含 cursor 和 limit')
    }
    return { mode: 'continue', cursor: cursorValue.trim(), limit: normalizeSearchLimit(record.limit) }
  }
  return {
    mode: 'initial',
    kbId: requiredString(record, 'kbId'),
    query: normalizeSearchPatterns(record.query, record.aliases),
    category: normalizeOptionalCategory(optionalString(record, 'category')),
    path: normalizeOptionalPath(optionalString(record, 'path')),
    limit: normalizeSearchLimit(record.limit),
  }
}

function normalizeOptionalCategory(category: string | undefined): string | undefined {
  const normalized = category?.trim()
  return normalized || undefined
}

function normalizeOptionalPath(path: string | undefined): string | undefined {
  if (path === undefined) return undefined
  if (!path.trim()) throw new KbError('invalid_field', 'path 不能是空字符串')
  return path.trim()
}

function validatePattern(pattern: string): void {
  if (pattern.length > SEARCH_MAX_PATTERN_LENGTH) {
    throw new KbError('invalid_field', `单个正则表达式不能超过 ${SEARCH_MAX_PATTERN_LENGTH} 个字符`)
  }
  const javascriptPattern = pattern.replace(/^\(\?[imsU-]+\)/u, '')
  try {
    new RegExp(javascriptPattern, 'u')
  } catch {
    throw new KbError('invalid_field', 'query 或 aliases 包含无效正则表达式')
  }
  if (/\(\?([=!]|<[=!])|\\\d/u.test(pattern)) {
    throw new KbError('invalid_field', SEARCH_UNSUPPORTED_PATTERN_MESSAGE)
  }
}

import { markUsed } from '../kb/bases.ts'
import { KbError } from '../../model/types.ts'
import type { SearchResult } from '../../model/search-result.ts'
import { encodeSearchCursor, cursorQueryFromSearch, decodeSearchCursor } from './pagination.ts'
import { searchFileDetail } from './file-search.ts'
import { searchOverview } from './overview-search.ts'
import { normalizeCursorQuery, normalizeSearchRequest, type SearchRequest } from './search-input.ts'
import { resolveSearchScope } from './search-scope.ts'
import { createRipgrepScanner, type SearchScanner } from './scanner/index.ts'

export async function searchBase(
  dataRoot: string,
  input: SearchRequest,
  scanner: SearchScanner = createRipgrepScanner(),
): Promise<SearchResult> {
  const request = normalizeSearchRequest(input)
  const result = request.mode === 'initial'
    ? await searchInitial(dataRoot, request, scanner)
    : await searchContinue(dataRoot, request.cursor, request.limit, scanner)
  await markUsed(dataRoot, result.baseId)
  return result
}

async function searchInitial(
  dataRoot: string,
  request: Extract<ReturnType<typeof normalizeSearchRequest>, { mode: 'initial' }>,
  scanner: SearchScanner,
): Promise<SearchResult> {
  const scope = await resolveSearchScope(dataRoot, {
    baseId: request.baseId,
    query: request.query,
    category: request.category,
    path: request.path,
  })
  if (scope.path) {
    const output = await searchFileDetail(scope, 0, request.limit, scanner)
    return addDetailCursor(output.result, output.nextHitIndex)
  }
  const output = await searchOverview(scope, 0, request.limit, scanner)
  return addOverviewCursor(output.result, output.nextFileIndex)
}

async function searchContinue(dataRoot: string, cursor: string, limit: number, scanner: SearchScanner): Promise<SearchResult> {
  const payload = decodeSearchCursor(cursor)
  const query = normalizeCursorQuery(payload.query)
  if (payload.scope === 'files') {
    const scope = await resolveSearchScope(dataRoot, { baseId: payload.query.baseId, query, category: payload.query.category })
    const output = await searchOverview(scope, payload.position.fileIndex, limit, scanner)
    return addOverviewCursor(output.result, output.nextFileIndex)
  }
  if (!payload.query.path) throw new KbError('invalid_field', '搜索游标缺少文件路径')
  const scope = await resolveSearchScope(dataRoot, {
    baseId: payload.query.baseId,
    query,
    category: payload.query.category,
    path: payload.query.path,
  })
  const output = await searchFileDetail(scope, payload.position.hitIndex, limit, scanner)
  return addDetailCursor(output.result, output.nextHitIndex)
}

function addOverviewCursor(result: Extract<SearchResult, { kind: 'overview' }>, nextFileIndex: number | undefined): Extract<SearchResult, { kind: 'overview' }> {
  if (!result.page.hasMore || nextFileIndex === undefined) return result
  const cursor = encodeSearchCursor({
    version: 3,
    scope: 'files',
    query: cursorQueryFromSearch(result.query, result.baseId, result.category),
    position: { fileIndex: nextFileIndex },
  })
  return { ...result, page: { ...result.page, nextCursor: cursor } }
}

function addDetailCursor(result: Extract<SearchResult, { kind: 'file-detail' }>, nextHitIndex: number | undefined): Extract<SearchResult, { kind: 'file-detail' }> {
  if (!result.page.hasMore || nextHitIndex === undefined) return result
  const cursor = encodeSearchCursor({
    version: 3,
    scope: 'hits',
    query: cursorQueryFromSearch(result.query, result.baseId, result.category, result.path) as { baseId: string; terms: string[]; aliases: string[]; category?: string; path: string },
    position: { hitIndex: nextHitIndex },
  })
  return { ...result, page: { ...result.page, nextCursor: cursor } }
}

export type { ContinueSearchRequest, InitialSearchRequest, SearchRequest } from './search-input.ts'
export type { SearchScanner } from './scanner/index.ts'

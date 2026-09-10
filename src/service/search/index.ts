import { KbError } from '../../model/error/kb-error.ts'
import type { SearchResult } from '../../model/response/search-response.ts'
import { encodeSearchCursor, cursorQueryFromSearch, decodeSearchCursor } from './pagination.ts'
import { searchFileDetail } from './file-search.ts'
import { searchOverview } from './overview-search.ts'
import { normalizeCursorQuery, normalizeSearchRequest, type SearchRequest } from './search-input.ts'
import { resolveSearchScope } from './search-scope.ts'
import { createRipgrepScanner, type SearchScanner } from './scanner/index.ts'
import type { SearchKbAccess } from './kb-access.ts'

export async function searchKb(
  dataRoot: string,
  input: SearchRequest,
  kbAccess: SearchKbAccess,
  scanner: SearchScanner = createRipgrepScanner(),
): Promise<SearchResult> {
  const request = normalizeSearchRequest(input)
  const result = request.mode === 'initial'
    ? await searchInitial(dataRoot, request, kbAccess, scanner)
    : await searchContinue(dataRoot, request.cursor, request.limit, kbAccess, scanner)
  await kbAccess.markKbUsed(result.kbId)
  return result
}

async function searchInitial(
  dataRoot: string,
  request: Extract<ReturnType<typeof normalizeSearchRequest>, { mode: 'initial' }>,
  kbAccess: SearchKbAccess,
  scanner: SearchScanner,
): Promise<SearchResult> {
  await kbAccess.ensureKb(request.kbId)
  const scope = await resolveSearchScope(dataRoot, {
    kbId: request.kbId,
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

async function searchContinue(
  dataRoot: string,
  cursor: string,
  limit: number,
  kbAccess: SearchKbAccess,
  scanner: SearchScanner,
): Promise<SearchResult> {
  const payload = decodeSearchCursor(cursor)
  await kbAccess.ensureKb(payload.query.kbId)
  const query = normalizeCursorQuery(payload.query)
  if (payload.scope === 'files') {
    const scope = await resolveSearchScope(dataRoot, { kbId: payload.query.kbId, query, category: payload.query.category })
    const output = await searchOverview(scope, payload.position.fileIndex, limit, scanner)
    return addOverviewCursor(output.result, output.nextFileIndex)
  }
  if (!payload.query.path) throw new KbError('invalid_field', '搜索游标缺少文件路径')
  const scope = await resolveSearchScope(dataRoot, {
    kbId: payload.query.kbId,
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
    version: 4,
    scope: 'files',
    query: cursorQueryFromSearch(result.query, result.kbId, result.category),
    position: { fileIndex: nextFileIndex },
  })
  return { ...result, page: { ...result.page, nextCursor: cursor } }
}

function addDetailCursor(result: Extract<SearchResult, { kind: 'file-detail' }>, nextHitIndex: number | undefined): Extract<SearchResult, { kind: 'file-detail' }> {
  if (!result.page.hasMore || nextHitIndex === undefined) return result
  const cursor = encodeSearchCursor({
    version: 4,
    scope: 'hits',
    query: cursorQueryFromSearch(result.query, result.kbId, result.category, result.path) as { kbId: string; terms: string[]; aliases: string[]; category?: string; path: string },
    position: { hitIndex: nextHitIndex },
  })
  return { ...result, page: { ...result.page, nextCursor: cursor } }
}

export type { SearchKbAccess } from './kb-access.ts'
export type { ContinueSearchRequest, InitialSearchRequest, SearchRequest } from './search-input.ts'
export type { SearchScanner } from './scanner/index.ts'

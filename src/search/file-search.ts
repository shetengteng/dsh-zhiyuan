import { SEARCH_CONTEXT, SEARCH_LIST_CONTEXT, SEARCH_PAGE_MAX_CHARS } from '../identity.ts'
import { contentRegistry } from '../content/host-api.ts'
import type { SearchDocument } from '../content/shared/search-document.ts'
import type { SearchFileDetailResult } from './result/file-detail-result.ts'
import type { SearchHit } from './result/result-shared.ts'
import type { SearchScanner } from './scanner/scanner-contract.ts'
import type { ResolvedSearchScope } from './search-scope.ts'
import { assertInside, assertNoSymlinkEscape } from '../paths.ts'
import { join } from 'node:path'
import { canMergeWindows, groupMatchesByFile, type FileMatchGroup } from './file-summary.ts'

export type FileDetailSearchOutput = {
  result: SearchFileDetailResult
  nextHitIndex?: number
}

type BuiltHit = {
  hit: SearchHit
  firstRawIndex: number
}

export async function searchFileDetail(
  scope: ResolvedSearchScope,
  hitIndex: number,
  limit: number,
  scanner: SearchScanner,
): Promise<FileDetailSearchOutput> {
  if (!scope.path || !scope.format) throw new Error('文件详情缺少目标路径')
  const scan = await scanner.scan({
    rootDir: scope.rootDir,
    terms: scope.query.terms,
    targetPath: scope.path,
    perFileMatchLimit: 'unlimited',
  })
  const group = groupMatchesByFile(scan.matches).find((item) => item.path === scope.path)
  const matches = group?.matches ?? []
  const warnings = [...scan.warnings]
  let document: SearchDocument | undefined
  if (matches.length) {
    const absolutePath = assertInside(scope.rootDir, join(scope.rootDir, ...scope.path.split('/')))
    assertNoSymlinkEscape(scope.rootDir, absolutePath)
    document = await contentRegistry.readForSearch({ absolutePath, relativePath: scope.path })
    for (const warning of document.warnings ?? []) if (!warnings.includes(warning)) warnings.push(warning)
  }
  const built: BuiltHits = document && group ? buildHits(group, hitIndex, document, scope.format, limit) : { hits: [], includedCount: 0 }
  const hasMore = scan.complete && built.includedCount < built.hits.length
  const hits = built.hits.slice(0, built.includedCount).map((item) => item.hit)
  const result: SearchFileDetailResult = {
    kind: 'file-detail',
    scope: 'hits',
    baseId: scope.baseId,
    ...(scope.category ? { category: scope.category } : {}),
    query: scope.query,
    path: scope.path,
    format: scope.format,
    totalHits: matches.length,
    ...(document?.groupHeader === undefined ? {} : { groupHeader: document.groupHeader }),
    hits,
    page: { scope: 'hits', returnedHits: hits.length, hasMore },
    scan: {
      complete: scan.complete,
      warnings,
      ...(scan.stopReason ? { stopReason: scan.stopReason } : {}),
    },
    presentation: { template: 'search-file-detail-card', version: 1 },
  }
  return {
    result,
    ...(hasMore && built.nextRawIndex !== undefined ? { nextHitIndex: built.nextRawIndex } : {}),
  }
}

type BuiltHits = {
  hits: BuiltHit[]
  includedCount: number
  nextRawIndex?: number
}

function buildHits(
  group: FileMatchGroup,
  startIndex: number,
  document: SearchDocument,
  format: SearchFileDetailResult['format'],
  limit: number,
): BuiltHits {
  const radius = format === 'csv' ? SEARCH_LIST_CONTEXT : SEARCH_CONTEXT
  const built: BuiltHit[] = []
  for (let rawIndex = Math.min(Math.max(startIndex, 0), group.matches.length); rawIndex < group.matches.length; rawIndex += 1) {
    const match = group.matches[rawIndex]
    const excerpt = document.excerptAt(match.line, radius)
    const previous = built.at(-1)
    if (previous && canMergeWindows(previous.hit, excerpt, document.mergeNeighbors !== false)) {
      const startLine = Math.min(previous.hit.startLine, excerpt.startLine)
      const endLine = Math.max(previous.hit.endLine, excerpt.endLine)
      previous.hit.excerpt = document.mergeExcerpt(
        { startLine: previous.hit.startLine, endLine: previous.hit.endLine, excerpt: previous.hit.excerpt },
        { startLine: excerpt.startLine, endLine: excerpt.endLine, excerpt: excerpt.excerpt },
        startLine,
        endLine,
      )
      previous.hit.startLine = startLine
      previous.hit.endLine = endLine
      continue
    }
    built.push({
      firstRawIndex: rawIndex,
      hit: {
        n: rawIndex + 1,
        path: group.path,
        startLine: excerpt.startLine,
        endLine: excerpt.endLine,
        matchLine: Math.min(Math.max(match.line, excerpt.startLine), excerpt.endLine),
        excerpt: excerpt.excerpt,
        ...(excerpt.matchedExcerpt === undefined ? {} : { matchedExcerpt: excerpt.matchedExcerpt }),
        matchColumnByte: document.normalizeColumnByte(match.line, match.columnByte),
        sourceFingerprint: document.fingerprint,
      },
    })
  }
  let usedChars = 0
  let includedCount = 0
  for (let index = 0; index < built.length && includedCount < limit; index += 1) {
    const item = built[index]
    const cost = 60 + item.hit.excerpt.length + (index === 0 ? group.path.length + (document.groupHeader?.length ?? 0) : 0)
    if (includedCount > 0 && usedChars + cost > SEARCH_PAGE_MAX_CHARS) break
    usedChars += cost
    includedCount += 1
  }
  return {
    hits: built,
    includedCount,
    ...(includedCount < built.length ? { nextRawIndex: built[includedCount].firstRawIndex } : {}),
  }
}

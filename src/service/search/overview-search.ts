import { contentRegistry } from '../../content/host-api.ts'
import type { SearchOverviewResult } from '../../model/response/search-response.ts'
import type { SearchScanner } from './scanner/scanner-contract.ts'
import type { ResolvedSearchScope } from './search-scope.ts'
import { groupMatchesByFile, summarizeFileGroups } from './file-summary.ts'

export type OverviewSearchOutput = {
  result: SearchOverviewResult
  nextFileIndex?: number
}

export async function searchOverview(
  scope: ResolvedSearchScope,
  fileIndex: number,
  limit: number,
  scanner: SearchScanner,
): Promise<OverviewSearchOutput> {
  const scan = await scanner.scan({
    rootDir: scope.rootDir,
    terms: scope.query.terms,
    ...(scope.category ? { targetPath: scope.category } : {}),
  })
  const groups = groupMatchesByFile(scan.matches)
  const files = summarizeFileGroups(groups)
  const totalHits = files.reduce((sum, file) => sum + file.totalHits, 0)
  const startIndex = Math.min(Math.max(fileIndex, 0), files.length)
  const pageFiles = files.slice(startIndex, startIndex + limit)
  const hasMore = scan.complete && startIndex + pageFiles.length < files.length
  const result: SearchOverviewResult = {
    kind: 'overview',
    scope: 'files',
    kbId: scope.kbId,
    ...(scope.category ? { category: scope.category } : {}),
    query: scope.query,
    files: pageFiles,
    totalFiles: files.length,
    totalHits,
    page: { scope: 'files', returnedFiles: pageFiles.length, hasMore },
    scan: {
      complete: scan.complete,
      warnings: [...scan.warnings],
      ...(scan.stopReason ? { stopReason: scan.stopReason } : {}),
    },
    presentation: { template: 'search-overview-card', version: 1 },
  }
  return {
    result,
    ...(hasMore ? { nextFileIndex: startIndex + pageFiles.length } : {}),
  }
}

export function isSearchableFormat(path: string): boolean {
  return contentRegistry.entryFormatForPath(path) !== undefined
}

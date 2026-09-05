import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { MAX_ALIASES, SEARCH_CONTEXT, SEARCH_LIST_CONTEXT, SEARCH_PAGE_MAX_CHARS, SEARCH_REST_FILES_LIMIT } from './identity.ts'
import { markUsed, requireBase } from './bases.ts'
import { contentRegistry, EntryFormat } from './content/host-api.ts'
import type { SearchDocument } from './content/shared/search-document.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, resolveDest } from './paths.ts'
import { canMergeWindows, groupMatchesByFile, prefixRawCounts, restFileList, type FileMatchGroup } from './search-groups.ts'
import { scanWithRipgrep } from './search-rg.ts'
import { decodeSearchCursor, encodeSearchCursor, searchQueryKey } from './search-cursor.ts'
import type { SearchEngine, SearchFileGroup, SearchHit, SearchInput, SearchPage, SearchPagePosition, SearchResult } from './types.ts'
import { KbError } from './types.ts'

export function mergeTerms(query: string, aliases: string[] | undefined): { terms: string[]; warnings: string[] } {
  const warnings: string[] = []
  let aliasList = (aliases ?? []).map((item) => item.trim()).filter(Boolean)
  if (aliasList.length > MAX_ALIASES) {
    warnings.push(`aliases 超过 ${MAX_ALIASES} 个，已截断`)
    aliasList = aliasList.slice(0, MAX_ALIASES)
  }
  const seen = new Set<string>()
  const terms: string[] = []
  for (const term of [query.trim(), ...aliasList]) {
    if (!term || seen.has(term)) continue
    seen.add(term)
    terms.push(term)
  }
  return { terms, warnings }
}

/** 每条命中的渲染开销估算：路径与行号标签的固定字符数。 */
const HIT_LABEL_OVERHEAD_CHARS = 60

type BuiltHit = {
  hit: SearchHit
  /** 该合并命中的首个原始命中下标（组内），游标与全局编号都基于它。 */
  firstRawIndex: number
}

/** 把组内原始命中转成展示命中：重叠（或相邻，视档位）合并为一条。 */
function buildMergedHits(group: FileMatchGroup, startIndex: number, document: SearchDocument, radius: number, allowNeighbors: boolean): BuiltHit[] {
  const built: BuiltHit[] = []
  for (let rawIndex = startIndex; rawIndex < group.matches.length; rawIndex += 1) {
    const match = group.matches[rawIndex]
    const clip = document.excerptAt(match.line, radius)
    const previous = built.at(-1)
    if (previous && canMergeWindows(previous.hit, clip, allowNeighbors)) {
      const startLine = Math.min(previous.hit.startLine, clip.startLine)
      const endLine = Math.max(previous.hit.endLine, clip.endLine)
      previous.hit.excerpt = document.mergeExcerpt(
        { startLine: previous.hit.startLine, endLine: previous.hit.endLine, excerpt: previous.hit.excerpt },
        { startLine: clip.startLine, endLine: clip.endLine, excerpt: clip.excerpt },
        startLine,
        endLine,
      )
      previous.hit.startLine = startLine
      previous.hit.endLine = endLine
      continue
    }
    built.push({
      hit: {
        n: 0,
        path: group.path,
        startLine: clip.startLine,
        endLine: clip.endLine,
        matchLine: Math.min(Math.max(match.line, clip.startLine), clip.endLine),
        excerpt: clip.excerpt,
        ...(clip.matchedExcerpt === undefined ? {} : { matchedExcerpt: clip.matchedExcerpt }),
        matchColumnByte: document.normalizeColumnByte(match.line, match.columnByte),
        sourceFingerprint: document.fingerprint,
      },
      firstRawIndex: rawIndex,
    })
  }
  return built
}

export class RipgrepSearchEngine implements SearchEngine {
  lastWarnings: string[] = []

  async search(input: SearchInput): Promise<SearchPage> {
    this.lastWarnings = []
    if (!existsSync(input.rootDir)) {
      return { files: [], totalFiles: 0, totalHits: 0, restFiles: [], hasMore: false, endPosition: { fileIndex: 0, hitIndex: 0 }, scanComplete: true }
    }
    const scan = await scanWithRipgrep(input.terms, input.rootDir)
    this.lastWarnings = scan.warnings
    const allGroups = groupMatchesByFile(scan.matches)
    const groups = input.path ? allGroups.filter((group) => group.path === input.path) : allGroups
    const page = await this.buildPage(input, groups)
    return {
      files: page.files,
      totalFiles: groups.length,
      totalHits: groups.reduce((sum, group) => sum + group.matches.length, 0),
      restFiles: page.restFiles,
      hasMore: page.hasMore,
      endPosition: page.endPosition,
      scanComplete: scan.scanComplete,
    }
  }

  private async readDocument(rootDir: string, relativePath: string, cache: Map<string, SearchDocument>): Promise<SearchDocument> {
    const cached = cache.get(relativePath)
    if (cached) return cached
    const absolutePath = join(rootDir, relativePath)
    const safePath = assertInside(rootDir, absolutePath)
    assertNoSymlinkEscape(rootDir, safePath)
    const document = await contentRegistry.readForSearch({ absolutePath: safePath, relativePath })
    cache.set(relativePath, document)
    for (const warning of document.warnings ?? []) {
      if (!this.lastWarnings.includes(warning)) this.lastWarnings.push(warning)
    }
    return document
  }

  /** 从游标断点起按字符预算切页：只读本页触碰到的文件。 */
  private async buildPage(input: SearchInput, groups: FileMatchGroup[]): Promise<{
    files: SearchFileGroup[]
    restFiles: Array<{ path: string; count: number }>
    hasMore: boolean
    endPosition: SearchPagePosition
  }> {
    const files: SearchFileGroup[] = []
    const fileCache = new Map<string, SearchDocument>()
    const prefixes = prefixRawCounts(groups)
    let usedChars = 0
    let pageHits = 0
    let lastTouchedIndex = -1
    let hasMore = false
    let endPosition: SearchPagePosition = { fileIndex: groups.length, hitIndex: 0 }
    let fileIndex = Math.min(Math.max(input.fileIndex, 0), groups.length)
    let startIndex = fileIndex === groups.length ? 0 : Math.max(input.hitIndex, 0)

    while (fileIndex < groups.length) {
      const group = groups[fileIndex]
      const rawStart = Math.min(startIndex, group.matches.length)
      startIndex = 0
      if (rawStart >= group.matches.length) {
        fileIndex += 1
        continue
      }
      const document = await this.readDocument(input.rootDir, group.path, fileCache)
      const format = contentRegistry.entryFormatForPath(group.path) ?? EntryFormat.Markdown
      const detailMode = input.path !== undefined
      const radius = detailMode
        ? (format === EntryFormat.Csv ? SEARCH_LIST_CONTEXT : SEARCH_CONTEXT)
        : (format === EntryFormat.Csv ? 0 : SEARCH_LIST_CONTEXT)
      const allowNeighbors = detailMode ? document.mergeNeighbors !== false : false
      const built = buildMergedHits(group, rawStart, document, radius, allowNeighbors)

      const headerCost = HIT_LABEL_OVERHEAD_CHARS + group.path.length + (document.groupHeader?.length ?? 0)
      let included = 0
      for (let index = 0; index < built.length; index += 1) {
        const cost = HIT_LABEL_OVERHEAD_CHARS + built[index].hit.excerpt.length + (index === 0 ? headerCost : 0)
        if (pageHits > 0 && usedChars + cost > SEARCH_PAGE_MAX_CHARS) break
        usedChars += cost
        included += 1
        pageHits += 1
      }

      if (included > 0) {
        lastTouchedIndex = fileIndex
        files.push({
          path: group.path,
          format,
          totalHits: group.matches.length,
          ...(document.groupHeader === undefined ? {} : { groupHeader: document.groupHeader }),
          hits: built.slice(0, included).map((item) => ({ ...item.hit, n: prefixes[fileIndex] + item.firstRawIndex + 1 })),
        })
      }
      if (included < built.length) {
        hasMore = true
        endPosition = { fileIndex, hitIndex: built[included].firstRawIndex }
        break
      }
      fileIndex += 1
    }

    return {
      files,
      restFiles: hasMore ? restFileList(groups, lastTouchedIndex, SEARCH_REST_FILES_LIMIT) : [],
      hasMore,
      endPosition,
    }
  }
}

/** 明细档 path：收敛为 rootDir 相对路径，绝对路径与越界路径直接拒绝。 */
function normalizeSearchPath(inputPath: string | undefined, rootDir: string): string | undefined {
  const trimmed = inputPath?.trim()
  if (!trimmed) return undefined
  if (isAbsolute(trimmed)) throw new KbError('invalid_field', 'path 必须是检索范围内的相对路径')
  const absolute = assertInside(rootDir, join(rootDir, trimmed))
  return relative(rootDir, absolute).split(sep).join('/')
}

export async function searchBase(
  dataRoot: string,
  input: { baseId: string; query: string; aliases?: string[]; category?: string; path?: string; cursor?: string },
  engine: SearchEngine = new RipgrepSearchEngine(),
): Promise<SearchResult> {
  if (!input.baseId?.trim()) throw new KbError('missing_field', 'kb_search 必须带 baseId')
  if (!input.query?.trim()) throw new KbError('missing_field', 'query 必填')
  await requireBase(dataRoot, input.baseId)
  const { terms, warnings } = mergeTerms(input.query, input.aliases)
  let rootDir = baseDir(dataRoot, input.baseId)
  if (input.category?.trim()) {
    try {
      const destination = resolveDest(dataRoot, input.baseId, input.category)
      if (existsSync(destination.absolute)) rootDir = destination.absolute
    } catch {
      /* 对不上则本库全扫 */
    }
  }
  const searchPath = normalizeSearchPath(input.path, rootDir)
  const queryKey = searchQueryKey({ baseId: input.baseId, rootDir, terms, path: searchPath })
  const cursor = input.cursor?.trim()
  const position = cursor ? decodeSearchCursor(cursor, queryKey) : { fileIndex: 0, hitIndex: 0 }
  const page = await engine.search({ baseId: input.baseId, rootDir, terms, path: searchPath, fileIndex: position.fileIndex, hitIndex: position.hitIndex })
  const extraWarnings = engine instanceof RipgrepSearchEngine ? engine.lastWarnings : []
  await markUsed(dataRoot, input.baseId)
  return {
    files: page.files,
    totalFiles: page.totalFiles,
    totalHits: page.totalHits,
    ...(page.restFiles.length ? { restFiles: page.restFiles } : {}),
    warnings: [...warnings, ...extraWarnings],
    scanComplete: page.scanComplete,
    hasMore: page.hasMore,
    ...(page.hasMore ? { nextCursor: encodeSearchCursor(page.endPosition, queryKey) } : {}),
  }
}

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { DEFAULT_TOP_K, MAX_ALIASES, MAX_TOP_K, SEARCH_CONTEXT, SEARCH_RG_MAX_COUNT_PER_FILE, SEARCH_RG_MAX_FILESIZE, SEARCH_RG_MAX_STDOUT_BYTES, SEARCH_RG_TIMEOUT_MS } from './identity.ts'
import { markUsed, requireBase } from './bases.ts'
import { contentRegistry } from './content/host-api.ts'
import { mergePhysicalExcerpts, type SearchDocument } from './content/shared/search-document.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, resolveDest } from './paths.ts'
import type { SearchEngine, SearchHit, SearchInput, SearchResult } from './types.ts'
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

type RipgrepMatch = { path: string; line: number; columnByte: number }
function parseRg(stdout: string, rootDir: string): RipgrepMatch[] {
  const matches: RipgrepMatch[] = []
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw.trim()) continue
    let value: unknown
    try {
      value = JSON.parse(raw) as unknown
    } catch {
      continue
    }
    const record = asRecord(value)
    if (record?.type !== 'match') continue
    const data = asRecord(record.data)
    const pathData = asRecord(data?.path)
    const printedPath = typeof pathData?.text === 'string' ? pathData.text : ''
    const line = typeof data?.line_number === 'number' ? data.line_number : 0
    const submatches = Array.isArray(data?.submatches) ? data.submatches : []
    const firstSubmatch = asRecord(submatches[0])
    const start = typeof firstSubmatch?.start === 'number' ? firstSubmatch.start : 0
    if (!printedPath || !Number.isInteger(line) || line < 1 || !Number.isInteger(start) || start < 0) continue
    const absolutePath = isAbsolute(printedPath) ? printedPath : join(rootDir, printedPath)
    const relativePath = relative(rootDir, absolutePath).split(sep).join('/')
    if (relativePath && !relativePath.startsWith('../') && relativePath !== '..') {
      matches.push({ path: relativePath, line, columnByte: start + 1 })
    }
  }
  return matches
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function mergeAdjacent(
  hits: Array<SearchHit & { file: string }>,
  documents: Map<string, SearchDocument>,
): Array<SearchHit & { file: string }> {
  const sorted = [...hits].sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine)
  const mergedHits: Array<SearchHit & { file: string }> = []
  for (const hit of sorted) {
    const previousHit = mergedHits.at(-1)
    if (previousHit && previousHit.file === hit.file && hit.startLine <= previousHit.endLine + 1) {
      const startLine = Math.min(previousHit.startLine, hit.startLine)
      const endLine = Math.max(previousHit.endLine, hit.endLine)
      const mergeExcerpt = documents.get(hit.file)?.mergeExcerpt ?? mergePhysicalExcerpts
      previousHit.excerpt = mergeExcerpt(previousHit, hit, startLine, endLine)
      previousHit.startLine = startLine
      previousHit.endLine = endLine
      if (hit.matchLine < previousHit.matchLine
        || (hit.matchLine === previousHit.matchLine
          && (hit.matchColumnByte ?? Number.MAX_SAFE_INTEGER) < (previousHit.matchColumnByte ?? Number.MAX_SAFE_INTEGER))) {
        previousHit.matchLine = hit.matchLine
        previousHit.matchColumnByte = hit.matchColumnByte
        previousHit.matchedExcerpt = hit.matchedExcerpt
      }
      continue
    }
    mergedHits.push({ ...hit })
  }
  return mergedHits
}

export function diversify(hits: Array<SearchHit & { file: string }>, topK: number): SearchHit[] {
  // 按文件分组后轮转挑选：每篇先各取一条，再按原顺序取第二条，直到凑满 topK。
  const hitsByFile = new Map<string, Array<SearchHit & { file: string }>>()
  for (const hit of hits) {
    const group = hitsByFile.get(hit.file)
    if (group) group.push(hit)
    else hitsByFile.set(hit.file, [hit])
  }
  const selectedHits: Array<SearchHit & { file: string }> = []
  const groups = [...hitsByFile.values()]
  for (let index = 0; selectedHits.length < topK; index += 1) {
    const roundHasHit = groups.some((group) => index < group.length)
    if (!roundHasHit) break
    for (const group of groups) {
      const hit = group[index]
      if (!hit) continue
      selectedHits.push(hit)
      if (selectedHits.length >= topK) break
    }
  }
  return selectedHits.map((hit, index) => ({
    n: index + 1,
    path: hit.path,
    startLine: hit.startLine,
    endLine: hit.endLine,
    matchLine: hit.matchLine,
    excerpt: hit.excerpt,
    ...(hit.matchedExcerpt === undefined ? {} : { matchedExcerpt: hit.matchedExcerpt }),
    matchColumnByte: hit.matchColumnByte,
    sourceFingerprint: hit.sourceFingerprint,
  }))
}

async function resolveRg(): Promise<string> {
  const mod = await import('@vscode/ripgrep')
  const ripgrepPath = (mod as { rgPath?: string }).rgPath
  if (!ripgrepPath || !existsSync(ripgrepPath)) throw new Error('找不到打包的 ripgrep')
  return ripgrepPath
}

type RgRun = {
  stdout: string
  warnings: string[]
}

function runRg(binaryPath: string, rgArgs: string[], workingDirectory: string): Promise<RgRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, rgArgs, { cwd: workingDirectory, windowsHide: true })
    const stdoutChunks: Buffer[] = []
    let stdoutBytes = 0
    let stderr = ''
    let timedOut = false
    let truncated = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, SEARCH_RG_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      stdoutChunks.push(buffer)
      stdoutBytes += buffer.length
      if (stdoutBytes > SEARCH_RG_MAX_STDOUT_BYTES) {
        truncated = true
        child.kill('SIGKILL')
      }
    })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const warnings: string[] = []
      if (timedOut) warnings.push('检索超时，已返回部分结果')
      if (truncated) warnings.push('检索结果过多，已截断')
      const stdout = Buffer.concat(stdoutChunks, stdoutBytes).toString('utf8')
      if (code === 0 || code === 1 || timedOut || truncated) resolve({ stdout, warnings })
      else reject(new Error(stderr.trim() || `rg 退出 ${code}`))
    })
  })
}

export class RipgrepSearchEngine implements SearchEngine {
  lastWarnings: string[] = []

  async search(input: SearchInput): Promise<SearchHit[]> {
    this.lastWarnings = []
    if (!existsSync(input.rootDir)) return []
    const ripgrepBinary = await resolveRg()
    const rgArgs = [
      '--json',
      '--column',
      '--glob-case-insensitive',
      '--max-count',
      String(SEARCH_RG_MAX_COUNT_PER_FILE),
      '--max-filesize',
      SEARCH_RG_MAX_FILESIZE,
    ]
    for (const glob of contentRegistry.searchGlobs()) rgArgs.push('--glob', glob)
    for (const term of input.terms) rgArgs.push('-e', term)
    rgArgs.push('.')
    const run = await runRg(ripgrepBinary, rgArgs, input.rootDir)
    this.lastWarnings = run.warnings
    const matches = parseRg(run.stdout, input.rootDir)
    const rawHits: Array<SearchHit & { file: string }> = []
    const fileCache = new Map<string, SearchDocument>()
    for (const match of matches) {
      const absolutePath = join(input.rootDir, match.path)
      const safePath = assertInside(input.rootDir, absolutePath)
      assertNoSymlinkEscape(input.rootDir, safePath)
      let file = fileCache.get(match.path)
      if (!file) {
        file = await contentRegistry.readForSearch({ absolutePath: safePath, relativePath: match.path })
        fileCache.set(match.path, file)
        for (const warning of file.warnings ?? []) {
          if (!this.lastWarnings.includes(warning)) this.lastWarnings.push(warning)
        }
      }
      const clip = file.excerptAt(match.line, SEARCH_CONTEXT)
      const matchColumnByte = file.normalizeColumnByte(match.line, match.columnByte)
      rawHits.push({
        n: 0,
        file: match.path,
        path: match.path,
        startLine: clip.startLine,
        endLine: clip.endLine,
        matchLine: Math.min(Math.max(match.line, clip.startLine), clip.endLine),
        excerpt: clip.excerpt,
        matchedExcerpt: clip.matchedExcerpt,
        matchColumnByte,
        sourceFingerprint: file.fingerprint,
      })
    }
    return diversify(mergeAdjacent(rawHits, fileCache), input.topK)
  }
}

export async function searchBase(
  dataRoot: string,
  input: { baseId: string; query: string; aliases?: string[]; category?: string; topK?: number },
  engine: SearchEngine = new RipgrepSearchEngine(),
): Promise<SearchResult> {
  if (!input.baseId?.trim()) throw new KbError('missing_field', 'kb_search 必须带 baseId')
  if (!input.query?.trim()) throw new KbError('missing_field', 'query 必填')
  await requireBase(dataRoot, input.baseId)
  const { terms, warnings } = mergeTerms(input.query, input.aliases)
  const topK = Math.min(MAX_TOP_K, Math.max(1, input.topK ?? DEFAULT_TOP_K))
  let rootDir = baseDir(dataRoot, input.baseId)
  if (input.category?.trim()) {
    try {
      const destination = resolveDest(dataRoot, input.baseId, input.category)
      if (existsSync(destination.absolute)) rootDir = destination.absolute
    } catch {
      /* 对不上则本库全扫 */
    }
  }
  const hits = await engine.search({ baseId: input.baseId, rootDir, terms, topK })
  const extraWarnings = engine instanceof RipgrepSearchEngine ? engine.lastWarnings : []
  await markUsed(dataRoot, input.baseId)
  return { hits, warnings: [...warnings, ...extraWarnings] }
}

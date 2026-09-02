import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { DEFAULT_TOP_K, MAX_ALIASES, MAX_TOP_K, SEARCH_CONTEXT } from './identity.ts'
import { markUsed, requireBase } from './bases.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, resolveDest } from './paths.ts'
import type { SearchDocument, SearchEngine, SearchHit, SearchInput, SearchResult } from './types.ts'
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

type RipgrepMatch = { path: string; line: number; text: string }

function parseRg(stdout: string, rootDir: string): RipgrepMatch[] {
  const matches: RipgrepMatch[] = []
  let currentPath = ''
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw) {
      currentPath = ''
      continue
    }
    if (raw === '--') continue
    const lineMatch = raw.match(/^(.*?):(\d+):(.*)$/)
    const contextMatch = raw.match(/^(.*?)-(\d+)-(.*)$/)
    const match = lineMatch ?? contextMatch
    if (!match) continue
    const printedPath = match[1]
    const absolutePath = isAbsolute(printedPath) ? printedPath : join(rootDir, printedPath)
    const relativePath = relative(rootDir, absolutePath).split(sep).join('/')
    currentPath = relativePath || currentPath
    if (lineMatch) matches.push({ path: currentPath || relativePath, line: Number(lineMatch[2]), text: lineMatch[3] })
  }
  return matches
}

function clipAround(lines: string[], center: number, radius: number): { start: number; end: number; excerpt: string } {
  const start = Math.max(1, center - radius)
  const end = Math.min(lines.length, center + radius)
  return { start, end, excerpt: lines.slice(start - 1, end).join('\n') }
}

function mergeExcerpts(first: SearchHit, second: SearchHit, startLine: number, endLine: number): string {
  const firstLines = first.excerpt.split(/\r?\n/)
  const secondLines = second.excerpt.split(/\r?\n/)
  const mergedLines: string[] = []
  for (let line = startLine; line <= endLine; line += 1) {
    if (line >= second.startLine && line <= second.endLine) {
      mergedLines.push(secondLines[line - second.startLine] ?? '')
    } else if (line >= first.startLine && line <= first.endLine) {
      mergedLines.push(firstLines[line - first.startLine] ?? '')
    } else {
      mergedLines.push('')
    }
  }
  return mergedLines.join('\n')
}

function mergeAdjacent(hits: Array<SearchHit & { file: string }>): Array<SearchHit & { file: string }> {
  const sorted = [...hits].sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine)
  const mergedHits: Array<SearchHit & { file: string }> = []
  for (const hit of sorted) {
    const previousHit = mergedHits.at(-1)
    if (previousHit && previousHit.file === hit.file && hit.startLine <= previousHit.endLine + 1) {
      const startLine = Math.min(previousHit.startLine, hit.startLine)
      const endLine = Math.max(previousHit.endLine, hit.endLine)
      previousHit.excerpt = mergeExcerpts(previousHit, hit, startLine, endLine)
      previousHit.startLine = startLine
      previousHit.endLine = endLine
      previousHit.matchLine = Math.min(previousHit.matchLine, hit.matchLine)
      continue
    }
    mergedHits.push({ ...hit })
  }
  return mergedHits
}

export function diversify(hits: Array<SearchHit & { file: string }>, topK: number): SearchHit[] {
  const fileHitCounts = new Map<string, number>()
  const selectedHits: Array<SearchHit & { file: string }> = []
  const remainingHits = [...hits]
  while (selectedHits.length < topK && remainingHits.length) {
    remainingHits.sort((a, b) => (fileHitCounts.get(a.file) ?? 0) - (fileHitCounts.get(b.file) ?? 0))
    const nextHit = remainingHits.shift()
    if (!nextHit) break
    fileHitCounts.set(nextHit.file, (fileHitCounts.get(nextHit.file) ?? 0) + 1)
    selectedHits.push(nextHit)
  }
  return selectedHits.map((hit, index) => ({
    n: index + 1,
    path: hit.path,
    startLine: hit.startLine,
    endLine: hit.endLine,
    matchLine: hit.matchLine,
    excerpt: hit.excerpt,
  }))
}

async function resolveRg(): Promise<string> {
  const mod = await import('@vscode/ripgrep')
  const ripgrepPath = (mod as { rgPath?: string }).rgPath
  if (!ripgrepPath || !existsSync(ripgrepPath)) throw new Error('找不到打包的 ripgrep')
  return ripgrepPath
}

function runRg(binaryPath: string, rgArgs: string[], workingDirectory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, rgArgs, { cwd: workingDirectory, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += String(chunk) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0 || code === 1) resolve(stdout)
      else reject(new Error(stderr.trim() || `rg 退出 ${code}`))
    })
  })
}

export class RipgrepSearchEngine implements SearchEngine {
  async search(input: SearchInput): Promise<SearchHit[]> {
    if (!existsSync(input.rootDir)) return []
    const ripgrepBinary = await resolveRg()
    const rgArgs = ['-n', '-C', String(SEARCH_CONTEXT), '--glob', '*.md', '--glob', '*.txt', '--glob', '*.markdown']
    for (const term of input.terms) rgArgs.push('-e', term)
    rgArgs.push('.')
    const stdout = await runRg(ripgrepBinary, rgArgs, input.rootDir)
    const matches = parseRg(stdout, input.rootDir)
    const rawHits: Array<SearchHit & { file: string }> = []
    for (const match of matches) {
      const absolutePath = join(input.rootDir, match.path)
      const lines = existsSync(absolutePath) ? (await readFile(absolutePath, 'utf8')).split(/\r?\n/) : [match.text]
      const clip = clipAround(lines, match.line, SEARCH_CONTEXT)
      rawHits.push({
        n: 0,
        file: match.path,
        path: match.path,
        startLine: clip.start,
        endLine: clip.end,
        matchLine: match.line,
        excerpt: clip.excerpt,
      })
    }
    return diversify(mergeAdjacent(rawHits), input.topK)
  }
}

async function readSearchDocuments(rootDir: string, hits: SearchHit[]): Promise<SearchDocument[]> {
  const documents: SearchDocument[] = []
  const seen = new Set<string>()
  for (const hit of hits) {
    if (seen.has(hit.path)) continue
    seen.add(hit.path)
    const absolutePath = assertInside(rootDir, join(rootDir, hit.path))
    assertNoSymlinkEscape(rootDir, absolutePath)
    try {
      documents.push({ path: hit.path, text: await readFile(absolutePath, 'utf8') })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
  }
  return documents
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
  const documents = await readSearchDocuments(rootDir, hits)
  await markUsed(dataRoot, input.baseId)
  return { hits, warnings, documents }
}

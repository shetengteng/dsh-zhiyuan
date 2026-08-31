import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { MAX_ALIASES, MAX_TOP_K, SEARCH_CONTEXT } from './identity.ts'
import { markUsed, requireBase } from './bases.ts'
import { baseDir, resolveDest } from './paths.ts'
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

type RgMatch = { path: string; line: number; text: string }

function parseRg(stdout: string, rootDir: string): RgMatch[] {
  const matches: RgMatch[] = []
  let currentPath = ''
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw) {
      currentPath = ''
      continue
    }
    if (raw === '--') continue
    const m = raw.match(/^(.*?):(\d+):(.*)$/)
    const ctx = raw.match(/^(.*?)-(\d+)-(.*)$/)
    const hit = m ?? ctx
    if (!hit) continue
    const printed = hit[1]
    const abs = isAbsolute(printed) ? printed : join(rootDir, printed)
    const rel = relative(rootDir, abs).split(sep).join('/')
    currentPath = rel || currentPath
    if (m) matches.push({ path: currentPath || rel, line: Number(m[2]), text: m[3] })
  }
  return matches
}

function clipAround(lines: string[], center: number, radius: number): { start: number; end: number; excerpt: string } {
  const start = Math.max(1, center - radius)
  const end = Math.min(lines.length, center + radius)
  return { start, end, excerpt: lines.slice(start - 1, end).join('\n') }
}

function mergeAdjacent(hits: Array<SearchHit & { file: string }>): Array<SearchHit & { file: string }> {
  const sorted = [...hits].sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine)
  const out: Array<SearchHit & { file: string }> = []
  for (const hit of sorted) {
    const prev = out.at(-1)
    if (prev && prev.file === hit.file && hit.startLine <= prev.endLine + 1) {
      prev.endLine = Math.max(prev.endLine, hit.endLine)
      prev.excerpt = hit.startLine < prev.startLine ? `${hit.excerpt}\n${prev.excerpt}` : `${prev.excerpt}\n${hit.excerpt}`
      prev.startLine = Math.min(prev.startLine, hit.startLine)
      continue
    }
    out.push({ ...hit })
  }
  return out
}

export function diversify(hits: Array<SearchHit & { file: string }>, topK: number): SearchHit[] {
  const counts = new Map<string, number>()
  const picked: Array<SearchHit & { file: string }> = []
  const rest = [...hits]
  while (picked.length < topK && rest.length) {
    rest.sort((a, b) => (counts.get(a.file) ?? 0) - (counts.get(b.file) ?? 0))
    const next = rest.shift()
    if (!next) break
    counts.set(next.file, (counts.get(next.file) ?? 0) + 1)
    picked.push(next)
  }
  return picked.map((hit, index) => ({
    n: index + 1,
    path: hit.path,
    startLine: hit.startLine,
    endLine: hit.endLine,
    excerpt: hit.excerpt,
  }))
}

async function resolveRg(): Promise<string> {
  const mod = await import('@vscode/ripgrep')
  const path = (mod as { rgPath?: string }).rgPath
  if (!path || !existsSync(path)) throw new Error('找不到打包的 ripgrep')
  return path
}

function runRg(bin: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, windowsHide: true })
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
    const bin = await resolveRg()
    const args = ['-n', '-C', String(SEARCH_CONTEXT), '--glob', '*.md', '--glob', '*.txt', '--glob', '*.markdown']
    for (const term of input.terms) args.push('-e', term)
    args.push('.')
    const stdout = await runRg(bin, args, input.rootDir)
    const matches = parseRg(stdout, input.rootDir)
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const raw: Array<SearchHit & { file: string }> = []
    for (const match of matches) {
      const abs = join(input.rootDir, match.path)
      const lines = existsSync(abs) ? (await readFile(abs, 'utf8')).split(/\r?\n/) : [match.text]
      const clip = clipAround(lines, match.line, SEARCH_CONTEXT)
      raw.push({
        n: 0,
        file: match.path,
        path: match.path,
        startLine: clip.start,
        endLine: clip.end,
        excerpt: clip.excerpt,
      })
    }
    return diversify(mergeAdjacent(raw), input.topK)
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
  const topK = Math.min(MAX_TOP_K, Math.max(1, input.topK ?? 12))
  let rootDir = baseDir(dataRoot, input.baseId)
  if (input.category?.trim()) {
    try {
      const dest = resolveDest(dataRoot, input.baseId, input.category)
      if (existsSync(dest.absolute)) rootDir = dest.absolute
    } catch {
      /* 对不上则本库全扫 */
    }
  }
  const hits = await engine.search({ baseId: input.baseId, rootDir, terms, topK })
  await markUsed(dataRoot, input.baseId)
  return { hits, warnings }
}

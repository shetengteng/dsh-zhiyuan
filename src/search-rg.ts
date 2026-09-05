/** ripgrep 子进程执行与命中元数据解析。只产出 path/line/column，不读文件内容。 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { SEARCH_RG_MAX_COUNT_PER_FILE, SEARCH_RG_MAX_FILESIZE, SEARCH_RG_MAX_STDOUT_BYTES, SEARCH_RG_TIMEOUT_MS } from './identity.ts'
import { contentRegistry } from './content/host-api.ts'
import type { MatchPosition } from './search-groups.ts'

export type RgScan = {
  matches: MatchPosition[]
  warnings: string[]
  scanComplete: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function parseRg(stdout: string, rootDir: string): MatchPosition[] {
  const matches: MatchPosition[] = []
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
    const line = data && typeof data.line_number === 'number' ? data.line_number : 0
    const submatches = data && Array.isArray(data.submatches) ? data.submatches : []
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

async function resolveRg(): Promise<string> {
  const mod = await import('@vscode/ripgrep')
  const ripgrepPath = (mod as { rgPath?: string }).rgPath
  if (!ripgrepPath || !existsSync(ripgrepPath)) throw new Error('找不到打包的 ripgrep')
  return ripgrepPath
}

type RgRun = {
  stdout: string
  warnings: string[]
  scanComplete: boolean
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
      if (code === 0 || code === 1 || timedOut || truncated) {
        resolve({ stdout, warnings, scanComplete: !timedOut && !truncated })
      }
      else reject(new Error(stderr.trim() || `rg 退出 ${code}`))
    })
  })
}

/** 重跑一次 rg：返回命中元数据、告警与扫描完整性。 */
export async function scanWithRipgrep(terms: string[], rootDir: string): Promise<RgScan> {
  const ripgrepBinary = await resolveRg()
  const rgArgs = [
    '--json',
    '--column',
    '--glob-case-insensitive',
    '--max-count',
    String(SEARCH_RG_MAX_COUNT_PER_FILE + 1),
    '--max-filesize',
    SEARCH_RG_MAX_FILESIZE,
  ]
  for (const glob of contentRegistry.searchGlobs()) rgArgs.push('--glob', glob)
  for (const term of terms) rgArgs.push('-e', term)
  rgArgs.push('.')
  const run = await runRg(ripgrepBinary, rgArgs, rootDir)
  const matches = parseRg(run.stdout, rootDir)
  const matchCounts = new Map<string, number>()
  for (const match of matches) {
    matchCounts.set(match.path, (matchCounts.get(match.path) ?? 0) + 1)
  }
  const warnings = [...run.warnings]
  const perFileTruncated = [...matchCounts.values()].some((count) => count > SEARCH_RG_MAX_COUNT_PER_FILE)
  if (perFileTruncated) warnings.push('单个文件命中超过扫描上限，结果可能不完整')
  return { matches, warnings, scanComplete: run.scanComplete && !perFileTruncated }
}

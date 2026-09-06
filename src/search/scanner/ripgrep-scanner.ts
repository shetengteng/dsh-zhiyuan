import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { SEARCH_RG_MAX_COUNT_PER_FILE, SEARCH_RG_MAX_FILESIZE, SEARCH_RG_MAX_STDOUT_BYTES, SEARCH_RG_TIMEOUT_MS } from '../../identity.ts'
import { contentRegistry } from '../../content/host-api.ts'
import type { ScannerInput, ScannerMatch, ScannerResult, SearchScanner } from './scanner-contract.ts'

export class RipgrepScanner implements SearchScanner {
  async scan(input: ScannerInput): Promise<ScannerResult> {
    const binaryPath = await resolveRg()
    const run = await runRg(binaryPath, buildArguments(input.terms, input.targetPath), input.rootDir)
    const matches = parseRg(run.stdout, input.rootDir)
    const matchesByFile = new Map<string, number>()
    for (const match of matches) matchesByFile.set(match.path, (matchesByFile.get(match.path) ?? 0) + 1)
    const perFileTruncated = [...matchesByFile.values()].some((count) => count > SEARCH_RG_MAX_COUNT_PER_FILE)
    if (perFileTruncated) {
      run.warnings.push('单个文件命中超过扫描上限，结果可能不完整')
      run.complete = false
      run.stopReason = 'per-file-match-limit'
    }
    return { matches, warnings: run.warnings, complete: run.complete, ...(run.stopReason ? { stopReason: run.stopReason } : {}) }
  }
}

export function createRipgrepScanner(): SearchScanner {
  return new RipgrepScanner()
}

type RgRun = {
  stdout: string
  warnings: string[]
  complete: boolean
  stopReason?: ScannerResult['stopReason']
}

function buildArguments(terms: string[], targetPath?: string): string[] {
  const args = [
    '--json',
    '--column',
    '--glob-case-insensitive',
    '--max-count',
    String(SEARCH_RG_MAX_COUNT_PER_FILE + 1),
    '--max-filesize',
    SEARCH_RG_MAX_FILESIZE,
  ]
  for (const glob of contentRegistry.searchGlobs()) args.push('--glob', glob)
  for (const term of terms) args.push('-e', term)
  args.push('--', targetPath ?? '.')
  return args
}

function runRg(binaryPath: string, args: string[], workingDirectory: string): Promise<RgRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { cwd: workingDirectory, windowsHide: true })
    const stdoutChunks: Buffer[] = []
    let stdoutBytes = 0
    let stderr = ''
    let stopReason: RgRun['stopReason']
    const timer = setTimeout(() => {
      stopReason = 'timeout'
      child.kill('SIGKILL')
    }, SEARCH_RG_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      stdoutChunks.push(buffer)
      stdoutBytes += buffer.length
      if (stdoutBytes > SEARCH_RG_MAX_STDOUT_BYTES && !stopReason) {
        stopReason = 'stdout-limit'
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
      const stdout = Buffer.concat(stdoutChunks, stdoutBytes).toString('utf8')
      if (stopReason) {
        resolve({ stdout, warnings: stopReason === 'timeout' ? ['检索超时，已返回部分结果'] : ['检索结果过多，已截断'], complete: false, stopReason })
        return
      }
      if (code === 0 || code === 1) {
        resolve({ stdout, warnings: [], complete: true })
        return
      }
      const detail = stderr.trim()
      resolve({ stdout, warnings: [detail ? `检索失败：${detail}` : '检索失败'], complete: false, stopReason: 'io-error' })
    })
  })
}

function parseRg(stdout: string, rootDir: string): ScannerMatch[] {
  const matches: ScannerMatch[] = []
  for (const rawLine of stdout.split(/\r?\n/u)) {
    if (!rawLine.trim()) continue
    let value: unknown
    try {
      value = JSON.parse(rawLine) as unknown
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
    const columnByte = typeof firstSubmatch?.start === 'number' ? firstSubmatch.start + 1 : 0
    if (!printedPath || !Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(columnByte) || columnByte < 1) continue
    const absolutePath = isAbsolute(printedPath) ? printedPath : join(rootDir, printedPath)
    const relativePath = relative(rootDir, absolutePath).split(sep).join('/')
    if (relativePath && relativePath !== '..' && !relativePath.startsWith('../')) {
      matches.push({ path: relativePath, line, columnByte })
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

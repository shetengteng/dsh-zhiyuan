import { existsSync, lstatSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { DATA_DIR_NAME } from './identity.ts'
import { importDsh } from './host-resolve.ts'
import { KbError } from './types.ts'

export type DestResolution = {
  relative: string
  absolute: string
  segments: string[]
  deep: boolean
}

let cachedRoot: string | undefined

function fallbackDataRoot(): string {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'data', DATA_DIR_NAME)
}

export async function resolveDataRoot(): Promise<string> {
  if (cachedRoot) return cachedRoot
  const homePaths = await importDsh<{ dshHomePath: (...segments: string[]) => string }>(
    '@deepseek-ai/dsh-home-paths',
    'lib/index.js',
  )
  cachedRoot = homePaths?.dshHomePath
    ? homePaths.dshHomePath('data', DATA_DIR_NAME)
    : fallbackDataRoot()
  return cachedRoot
}

export function setDataRootForTest(root: string | undefined): void {
  cachedRoot = root
}

export function clearDataRootCache(): void {
  cachedRoot = undefined
}

export function basesRoot(dataRoot: string): string {
  return join(dataRoot, 'bases')
}

export function baseDir(dataRoot: string, baseId: string): string {
  return join(basesRoot(dataRoot), baseId)
}

export function catalogPath(dataRoot: string): string {
  return join(dataRoot, 'catalog.json')
}

export function statePath(dataRoot: string): string {
  return join(dataRoot, 'state.json')
}

function splitCategory(destCategory: string): string[] {
  return destCategory
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function assertInside(root: string, candidate: string): string {
  const absRoot = resolve(root)
  const abs = resolve(candidate)
  const rel = relative(absRoot, abs)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new KbError('path_escape', `路径必须仍在 ${absRoot} 下`)
  }
  return abs
}

function rejectEscapeTokens(segments: string[]): void {
  for (const part of segments) {
    if (part === '..' || part === '.' || part.includes('\0')) {
      throw new KbError('path_escape', '类目不能包含 .. 或绝对路径')
    }
    if (part.includes(':') && part.length <= 2) {
      throw new KbError('path_escape', '类目不能包含绝对路径')
    }
  }
}

export function resolveDest(dataRoot: string, baseId: string, destCategory: string): DestResolution {
  if (isAbsolute(destCategory) || destCategory.startsWith('~')) {
    throw new KbError('path_escape', '类目必须是库内相对路径')
  }
  const segments = splitCategory(destCategory)
  rejectEscapeTokens(segments)
  const joined = segments.join('/')
  const root = baseDir(dataRoot, baseId)
  const absolute = assertInside(root, join(root, ...segments))
  const normalizedRel = relative(root, absolute).split(sep).join('/')
  if (normalizedRel === '..' || normalizedRel.startsWith('../')) {
    throw new KbError('path_escape', '解析后的路径逃出了当前库')
  }
  return {
    relative: normalizedRel === '.' ? '' : normalizedRel,
    absolute,
    segments,
    deep: segments.length > 4,
  }
}

export function resolveEntry(dataRoot: string, baseId: string, relPath: string): string {
  return resolveDest(dataRoot, baseId, relPath).absolute
}

export function assertNoSymlinkEscape(root: string, candidate: string): void {
  const absRoot = resolve(root)
  let cursor = candidate
  while (true) {
    if (existsSync(cursor)) {
      const stat = lstatSync(cursor)
      if (stat.isSymbolicLink()) {
        const real = realpathSync(cursor)
        const rel = relative(absRoot, real)
        if (rel.startsWith('..') || isAbsolute(rel)) {
          throw new KbError('path_escape', '符号链接不能逃出知识库目录')
        }
      }
    }
    const parent = resolve(cursor, '..')
    if (parent === cursor || relative(absRoot, parent).startsWith('..')) break
    cursor = parent
  }
}

export function expandUserPath(sourcePath: string): string {
  if (sourcePath === '~') return homedir()
  if (sourcePath.startsWith('~/') || sourcePath.startsWith('~\\')) {
    return join(homedir(), sourcePath.slice(2))
  }
  return normalize(sourcePath)
}

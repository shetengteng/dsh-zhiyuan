import { existsSync, lstatSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { DATA_DIR_NAME } from './identity.ts'
import { importDsh } from './host-resolve.ts'
import { KbError } from './types.ts'

export type DestinationResolution = {
  relative: string
  absolute: string
  segments: string[]
  deep: boolean
}

let cachedDataRoot: string | undefined

function fallbackDataRoot(): string {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'data', DATA_DIR_NAME)
}

export async function resolveDataRoot(): Promise<string> {
  if (cachedDataRoot) return cachedDataRoot
  const homePaths = await importDsh<{ dshHomePath: (...segments: string[]) => string }>(
    '@deepseek-ai/dsh-home-paths',
    'lib/index.js',
  )
  cachedDataRoot = homePaths?.dshHomePath
    ? homePaths.dshHomePath('data', DATA_DIR_NAME)
    : fallbackDataRoot()
  return cachedDataRoot
}

export function setDataRootForTest(dataRoot: string | undefined): void {
  cachedDataRoot = dataRoot
}

export function clearDataRootCache(): void {
  cachedDataRoot = undefined
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

function splitCategory(destinationCategory: string): string[] {
  return destinationCategory
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function assertInside(baseRoot: string, candidatePath: string): string {
  const absoluteRoot = resolve(baseRoot)
  const absoluteCandidate = resolve(candidatePath)
  const relativePath = relative(absoluteRoot, absoluteCandidate)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new KbError('path_escape', `路径必须仍在 ${absoluteRoot} 下`)
  }
  return absoluteCandidate
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

export function resolveDest(dataRoot: string, baseId: string, destinationCategory: string): DestinationResolution {
  if (isAbsolute(destinationCategory) || destinationCategory.startsWith('~')) {
    throw new KbError('path_escape', '类目必须是库内相对路径')
  }
  const categorySegments = splitCategory(destinationCategory)
  rejectEscapeTokens(categorySegments)
  const baseRoot = baseDir(dataRoot, baseId)
  const absoluteDestination = assertInside(baseRoot, join(baseRoot, ...categorySegments))
  const normalizedRelativePath = relative(baseRoot, absoluteDestination).split(sep).join('/')
  if (normalizedRelativePath === '..' || normalizedRelativePath.startsWith('../')) {
    throw new KbError('path_escape', '解析后的路径逃出了当前库')
  }
  return {
    relative: normalizedRelativePath === '.' ? '' : normalizedRelativePath,
    absolute: absoluteDestination,
    segments: categorySegments,
    deep: categorySegments.length > 4,
  }
}

export function resolveEntry(dataRoot: string, baseId: string, relativePath: string): string {
  return resolveDest(dataRoot, baseId, relativePath).absolute
}

export function assertNoSymlinkEscape(baseRoot: string, candidatePath: string): void {
  const absoluteRoot = resolve(baseRoot)
  let currentPath = candidatePath
  while (true) {
    if (existsSync(currentPath)) {
      const stat = lstatSync(currentPath)
      if (stat.isSymbolicLink()) {
        const realPath = realpathSync(currentPath)
        const relativeRealPath = relative(absoluteRoot, realPath)
        if (relativeRealPath.startsWith('..') || isAbsolute(relativeRealPath)) {
          throw new KbError('path_escape', '符号链接不能逃出知识库目录')
        }
      }
    }
    const parentPath = resolve(currentPath, '..')
    if (parentPath === currentPath || relative(absoluteRoot, parentPath).startsWith('..')) break
    currentPath = parentPath
  }
}

export function expandUserPath(sourcePath: string): string {
  if (sourcePath === '~') return homedir()
  if (sourcePath.startsWith('~/') || sourcePath.startsWith('~\\')) {
    return join(homedir(), sourcePath.slice(2))
  }
  return normalize(sourcePath)
}

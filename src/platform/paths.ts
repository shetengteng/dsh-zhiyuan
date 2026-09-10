import { existsSync, lstatSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import type { DestinationResolution } from '../model/context/kb-context.ts'
import { KbError } from '../model/error/kb-error.ts'
import { DATA_DIR_NAME } from '../model/constants.ts'
import { importDsh } from './import-dsh.ts'

export type { DestinationResolution } from '../model/context/kb-context.ts'

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

export function kbsRoot(dataRoot: string): string {
  return join(dataRoot, 'kbs')
}

export function kbDir(dataRoot: string, kbId: string): string {
  return join(kbsRoot(dataRoot), kbId)
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

export function assertInside(kbRoot: string, candidatePath: string): string {
  const absoluteRoot = resolve(kbRoot)
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

export function resolveDest(dataRoot: string, kbId: string, destinationCategory: string): DestinationResolution {
  if (isAbsolute(destinationCategory) || destinationCategory.startsWith('~')) {
    throw new KbError('path_escape', '类目必须是库内相对路径')
  }
  const categorySegments = splitCategory(destinationCategory)
  rejectEscapeTokens(categorySegments)
  const kbRoot = kbDir(dataRoot, kbId)
  const absoluteDestination = assertInside(kbRoot, join(kbRoot, ...categorySegments))
  const normalizedRelativePath = relative(kbRoot, absoluteDestination).split(sep).join('/')
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

export function resolveEntry(dataRoot: string, kbId: string, relativePath: string): string {
  return resolveDest(dataRoot, kbId, relativePath).absolute
}

export function assertNoSymlinkEscape(kbRoot: string, candidatePath: string): void {
  const absoluteRoot = resolve(kbRoot)
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

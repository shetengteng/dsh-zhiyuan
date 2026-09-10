import { existsSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { contentRegistry } from '../../content/host-api.ts'
import type { EntryFormat } from '../../model/content-contract.ts'
import { kbDir, assertInside, assertNoSymlinkEscape, resolveDest } from '../../platform/paths.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type { SearchQuery } from '../../model/response/search-response.ts'

export type ResolvedSearchScope = {
  kbId: string
  rootDir: string
  query: SearchQuery
  category?: string
  categoryRoot: string
  path?: string
  format?: EntryFormat
}

export async function resolveSearchScope(
  dataRoot: string,
  input: { kbId: string; query: SearchQuery; category?: string; path?: string },
): Promise<ResolvedSearchScope> {
  const rootDir = kbDir(dataRoot, input.kbId)
  const category = resolveCategory(rootDir, dataRoot, input.kbId, input.category)
  const categoryRoot = category ? resolveDest(dataRoot, input.kbId, category).absolute : rootDir
  const path = input.path === undefined ? undefined : resolveKnowledgePath(rootDir, categoryRoot, input.path)
  const format = path ? contentRegistry.entryFormatForPath(path) : undefined
  if (path && !format) throw new KbError('ext_denied', 'path 不是知识库支持的文件格式')
  return {
    kbId: input.kbId,
    rootDir,
    query: input.query,
    ...(category ? { category } : {}),
    categoryRoot,
    ...(path ? { path } : {}),
    ...(format ? { format } : {}),
  }
}

function resolveCategory(rootDir: string, dataRoot: string, kbId: string, category: string | undefined): string | undefined {
  if (!category) return undefined
  const destination = resolveDest(dataRoot, kbId, category)
  assertNoSymlinkEscape(rootDir, destination.absolute)
  if (!existsSync(destination.absolute) || !statSync(destination.absolute).isDirectory()) {
    throw new KbError('not_found', `类目不存在：${destination.relative || category}`)
  }
  return destination.relative
}

function resolveKnowledgePath(rootDir: string, categoryRoot: string, inputPath: string): string {
  const path = inputPath.trim()
  if (!path || path.includes('\\') || path.includes('\0') || path.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(path)) {
    throw new KbError('invalid_field', 'path 必须是知识库根目录下的 POSIX 相对路径')
  }
  const segments = path.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new KbError('path_escape', 'path 不能包含 .、.. 或空路径段')
  }
  if (isAbsolute(path)) throw new KbError('invalid_field', 'path 必须是知识库根目录下的 POSIX 相对路径')
  const absolutePath = assertInside(rootDir, join(rootDir, ...segments))
  const normalizedPath = relative(rootDir, absolutePath).split(sep).join('/')
  if (normalizedPath !== path) throw new KbError('invalid_field', 'path 不是规范的知识库相对路径')
  assertInside(categoryRoot, absolutePath)
  assertNoSymlinkEscape(rootDir, absolutePath)
  if (!existsSync(absolutePath)) throw new KbError('not_found', `文件不存在：${path}`)
  if (!statSync(absolutePath).isFile()) throw new KbError('invalid_field', 'path 必须指向文件')
  return normalizedPath
}

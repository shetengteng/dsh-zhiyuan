import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { contentRegistry } from '../../content/host-api.ts'
import type { BaseCard, BaseSummary, TreeNode } from '../../model/types.ts'
import { baseDir } from '../../platform/paths.ts'
import { readCatalog } from './catalog.ts'
import { directoryExists, requireBase, scanBaseIds } from './bases.ts'

// 目录树与统计：只识别内容 registry 白名单中的库内条目。

async function walkTextDocuments(directoryPath: string): Promise<string[]> {
  const documentPaths: string[] = []
  let entries: Dirent<string>[]
  try {
    entries = await readdir(directoryPath, { withFileTypes: true })
  } catch {
    return documentPaths
  }
  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name)
    if (entry.isDirectory()) documentPaths.push(...await walkTextDocuments(entryPath))
    else if (entry.isFile() && contentRegistry.isStoredEntryPath(entry.name)) documentPaths.push(entryPath)
  }
  return documentPaths
}

export async function countDocs(dataRoot: string, baseId: string): Promise<number> {
  return (await walkTextDocuments(baseDir(dataRoot, baseId))).length
}

/** 条目写入前的全库配额统计，供 entry 模块复用。 */
export async function textDocumentBytes(baseRoot: string): Promise<number> {
  const paths = await walkTextDocuments(baseRoot)
  let total = 0
  for (const documentPath of paths) total += (await stat(documentPath)).size
  return total
}

async function listBaseCategories(dataRoot: string, baseId: string): Promise<string[]> {
  const baseDirectory = baseDir(dataRoot, baseId)
  if (!(await directoryExists(baseDirectory))) return []
  const entries = await readdir(baseDirectory, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
}

function createBaseCardFromDirectory(id: string): BaseCard {
  return { id, title: id, description: '', aliases: [], createdAt: 0, lastUsedAt: 0 }
}

export async function listBases(dataRoot: string): Promise<BaseSummary[]> {
  const catalog = await readCatalog(dataRoot)
  const onDiskBaseIds = await scanBaseIds(dataRoot)
  const cardsById = new Map(catalog.bases.map((card) => [card.id, card]))
  const baseIds = [...new Set([...onDiskBaseIds, ...catalog.bases.map((card) => card.id)])]
  const summaries: BaseSummary[] = []
  for (const id of baseIds.sort()) {
    const card = cardsById.get(id) ?? createBaseCardFromDirectory(id)
    summaries.push({
      ...card,
      categories: await listBaseCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedBaseId === id,
    })
  }
  return summaries
}

async function walkTree(baseRoot: string, directoryPath: string): Promise<TreeNode[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const nodes: TreeNode[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'zh'))) {
    const absolutePath = join(directoryPath, entry.name)
    const relativePath = relative(baseRoot, absolutePath).split(sep).join('/')
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: 'dir', path: relativePath, children: await walkTree(baseRoot, absolutePath) })
      continue
    }
    if (!entry.isFile() || !contentRegistry.isStoredEntryPath(entry.name)) continue
    const info = await stat(absolutePath)
    nodes.push({ name: entry.name, kind: 'file', path: relativePath, size: info.size, mtime: info.mtimeMs })
  }
  return nodes
}

export async function listTree(dataRoot: string, baseId: string): Promise<TreeNode[]> {
  await requireBase(dataRoot, baseId)
  const baseRoot = baseDir(dataRoot, baseId)
  if (!(await directoryExists(baseRoot))) return []
  return walkTree(baseRoot, baseRoot)
}

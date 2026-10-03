import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { contentRegistry } from '../../content/host-api.ts'
import type { KbCard } from '../../model/entity/catalog.ts'
import type { KbSummaryResponse, KbTreeNodeResponse } from '../../model/response/kb-response.ts'
import { kbDir } from '../../platform/paths.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { directoryExists, requireKb, scanKbIds } from './kb-lifecycle.ts'

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

export async function countDocs(dataRoot: string, kbId: string): Promise<number> {
  return (await walkTextDocuments(kbDir(dataRoot, kbId))).length
}

/** 条目写入前的全库配额统计，供 entry 模块复用。 */
export async function textDocumentBytes(kbRoot: string): Promise<number> {
  const paths = await walkTextDocuments(kbRoot)
  let total = 0
  for (const documentPath of paths) total += (await stat(documentPath)).size
  return total
}

async function listKbCategories(dataRoot: string, kbId: string): Promise<string[]> {
  const kbDirectory = kbDir(dataRoot, kbId)
  if (!(await directoryExists(kbDirectory))) return []
  const entries = await readdir(kbDirectory, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
}

function createKbCardFromDirectory(id: string): KbCard {
  return { id, title: id, description: '', aliases: [], createdAt: 0, lastUsedAt: 0 }
}

export async function listKbs(catalogRepository: CatalogRepository, dataRoot: string): Promise<KbSummaryResponse[]> {
  const catalog = await catalogRepository.read(dataRoot)
  const onDiskKbIds = await scanKbIds(dataRoot)
  const cardsById = new Map(catalog.kbs.map((card) => [card.id, card]))
  const kbIds = [...new Set([...onDiskKbIds, ...catalog.kbs.map((card) => card.id)])]
  const summaries: KbSummaryResponse[] = []
  for (const id of kbIds.sort()) {
    const card = cardsById.get(id) ?? createKbCardFromDirectory(id)
    summaries.push({
      ...card,
      categories: await listKbCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedKbId === id,
    })
  }
  return summaries
}

async function walkTree(kbRoot: string, directoryPath: string): Promise<KbTreeNodeResponse[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const nodes: KbTreeNodeResponse[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'zh'))) {
    const absolutePath = join(directoryPath, entry.name)
    const relativePath = relative(kbRoot, absolutePath).split(sep).join('/')
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: 'dir', path: relativePath, children: await walkTree(kbRoot, absolutePath) })
      continue
    }
    if (!entry.isFile() || !contentRegistry.isStoredEntryPath(entry.name)) continue
    const info = await stat(absolutePath)
    nodes.push({ name: entry.name, kind: 'file', path: relativePath, size: info.size, mtime: info.mtimeMs })
  }
  return nodes
}

export async function listTree(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
): Promise<KbTreeNodeResponse[]> {
  await requireKb(catalogRepository, dataRoot, kbId)
  const kbRoot = kbDir(dataRoot, kbId)
  if (!(await directoryExists(kbRoot))) return []
  return walkTree(kbRoot, kbRoot)
}

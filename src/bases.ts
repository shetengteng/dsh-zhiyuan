import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, relative, sep } from 'node:path'
import { cleanAliases, readCatalog, removeBase, upsertBase, writeCatalog } from './catalog.ts'
import { contentRegistry, type EntryPreviewOptions } from './content/host-api.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, basesRoot, resolveDest } from './paths.ts'
import type { BaseCard, BaseSummary, Catalog, CreateBaseInput, ReadEntryResult, TreeNode, UpdateBasePatch } from './types.ts'
import { KbError } from './types.ts'

function requireNonEmptyText(value: string | undefined, field: string): string {
  const text = value?.trim() ?? ''
  if (!text) throw new KbError('missing_field', `${field} 必填`)
  return text
}

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    return (await stat(directoryPath)).isDirectory()
  } catch {
    return false
  }
}

export async function scanBaseIds(dataRoot: string): Promise<string[]> {
  const basesDirectory = basesRoot(dataRoot)
  if (!(await directoryExists(basesDirectory))) return []
  const entries = await readdir(basesDirectory, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
}

async function walkTextDocuments(directoryPath: string): Promise<string[]> {
  const documentPaths: string[] = []
  let entries: Awaited<ReturnType<typeof readdir>>
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

async function hasBaseTitle(dataRoot: string, catalog: Catalog, title: string, excludeId?: string): Promise<boolean> {
  if (catalog.bases.some((card) => card.id !== excludeId && card.title === title)) return true
  const catalogIds = new Set(catalog.bases.map((card) => card.id))
  return (await scanBaseIds(dataRoot)).some((id) => id !== excludeId && !catalogIds.has(id) && id.trim() === title)
}

async function generateBaseId(dataRoot: string, catalog: Catalog): Promise<string> {
  const existingIds = new Set([...catalog.bases.map((card) => card.id), ...await scanBaseIds(dataRoot)])
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID()
    if (!existingIds.has(id)) return id
  }
  throw new KbError('base_exists', '无法生成唯一知识库 ID，请重试')
}

export async function createBase(dataRoot: string, input: CreateBaseInput): Promise<BaseCard> {
  const title = requireNonEmptyText(input.title, 'title')
  const description = requireNonEmptyText(input.description, 'description')
  const catalog = await readCatalog(dataRoot)
  if (await hasBaseTitle(dataRoot, catalog, title)) {
    throw new KbError('title_exists', `知识库标题「${title}」已存在`)
  }
  const id = await generateBaseId(dataRoot, catalog)
  const now = Date.now()
  const card: BaseCard = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now }
  await mkdir(baseDir(dataRoot, id), { recursive: true })
  const nextCatalog = upsertBase(catalog, card)
  if (!nextCatalog.lastUsedBaseId) nextCatalog.lastUsedBaseId = id
  if (!nextCatalog.prefs.defaultBaseId) nextCatalog.prefs.defaultBaseId = id
  await writeCatalog(dataRoot, nextCatalog)
  return card
}

export async function updateBase(dataRoot: string, id: string, patch: UpdateBasePatch): Promise<BaseCard> {
  const catalog = await readCatalog(dataRoot)
  const currentCard = catalog.bases.find((card) => card.id === id)
  if (!currentCard) throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
  const title = patch.title !== undefined ? requireNonEmptyText(patch.title, 'title') : currentCard.title
  if (await hasBaseTitle(dataRoot, catalog, title, id)) {
    throw new KbError('title_exists', `知识库标题「${title}」已存在`)
  }
  const card: BaseCard = {
    ...currentCard,
    title,
    description: patch.description !== undefined ? requireNonEmptyText(patch.description, 'description') : currentCard.description,
    aliases: patch.aliases !== undefined ? cleanAliases(patch.aliases) : currentCard.aliases,
  }
  await writeCatalog(dataRoot, upsertBase(catalog, card))
  return card
}

export async function deleteBase(dataRoot: string, id: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除知识库需要确认')
  const catalog = await readCatalog(dataRoot)
  const knownBaseIds = new Set([...catalog.bases.map((card) => card.id), ...await scanBaseIds(dataRoot)])
  if (!knownBaseIds.has(id)) throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
  const basesDirectory = basesRoot(dataRoot)
  const targetBaseDirectory = assertInside(basesDirectory, baseDir(dataRoot, id))
  assertNoSymlinkEscape(basesDirectory, targetBaseDirectory)
  await rm(targetBaseDirectory, { recursive: true, force: true })
  await writeCatalog(dataRoot, removeBase(catalog, id))
}

export async function markUsed(dataRoot: string, id: string): Promise<void> {
  const catalog = await readCatalog(dataRoot)
  const currentCard = catalog.bases.find((card) => card.id === id)
  if (!currentCard) return
  currentCard.lastUsedAt = Date.now()
  catalog.lastUsedBaseId = id
  await writeCatalog(dataRoot, catalog)
}

export async function requireBase(dataRoot: string, id: string): Promise<void> {
  const catalog = await readCatalog(dataRoot)
  if (catalog.bases.some((card) => card.id === id) || await directoryExists(baseDir(dataRoot, id))) return
  throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
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

export async function readEntry(
  dataRoot: string,
  baseId: string,
  relativePath: string,
  options: EntryPreviewOptions = {},
): Promise<ReadEntryResult> {
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  const baseRoot = baseDir(dataRoot, baseId)
  assertNoSymlinkEscape(baseRoot, absolutePath)
  try {
    return await contentRegistry.readPreview({ absolutePath, relativePath, options })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new KbError('not_found', `文件不存在：${relativePath}`)
    }
    throw error
  }
}

export async function writeEntry(dataRoot: string, baseId: string, relativePath: string, text: string): Promise<void> {
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  const baseRoot = baseDir(dataRoot, baseId)
  assertInside(baseRoot, absolutePath)
  assertNoSymlinkEscape(baseRoot, absolutePath)
  await contentRegistry.writeEntry({ absolutePath, relativePath, text })
}

export async function deleteEntry(dataRoot: string, baseId: string, relativePath: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除文件或类目需要确认')
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  assertInside(baseDir(dataRoot, baseId), absolutePath)
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath)
  await rm(absolutePath, { recursive: true, force: true })
}

import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { BASE_ID_RE, TEXT_EXTS } from './identity.ts'
import { cleanAliases, readCatalog, removeBase, upsertBase, writeCatalog } from './catalog.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, basesRoot, resolveDest } from './paths.ts'
import type { BaseCard, BaseSummary, CreateBaseInput, ReadEntryResult, TreeNode, UpdateBasePatch } from './types.ts'
import { KbError } from './types.ts'

function requireNonEmptyText(value: string | undefined, field: string): string {
  const text = value?.trim() ?? ''
  if (!text) throw new KbError('missing_field', `${field} 必填`)
  return text
}

function requireId(id: string): string {
  const value = requireNonEmptyText(id, 'id')
  if (!BASE_ID_RE.test(value)) {
    throw new KbError('invalid_id', 'id 只能是小写字母、数字、_ 或 -，最长 64')
  }
  return value
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
    else if (TEXT_EXTS.has(extensionOf(entry.name))) documentPaths.push(entryPath)
  }
  return documentPaths
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index).toLowerCase() : ''
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

export async function createBase(dataRoot: string, input: CreateBaseInput): Promise<BaseCard> {
  const id = requireId(input.id)
  const title = requireNonEmptyText(input.title, 'title')
  const description = requireNonEmptyText(input.description, 'description')
  const catalog = await readCatalog(dataRoot)
  if (catalog.bases.some((card) => card.id === id) || await directoryExists(baseDir(dataRoot, id))) {
    throw new KbError('base_exists', `知识库 ${id} 已存在`)
  }
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
  const card: BaseCard = {
    ...currentCard,
    title: patch.title !== undefined ? requireNonEmptyText(patch.title, 'title') : currentCard.title,
    description: patch.description !== undefined ? requireNonEmptyText(patch.description, 'description') : currentCard.description,
    aliases: patch.aliases !== undefined ? cleanAliases(patch.aliases) : currentCard.aliases,
  }
  await writeCatalog(dataRoot, upsertBase(catalog, card))
  return card
}

export async function deleteBase(dataRoot: string, id: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除知识库需要确认')
  const catalog = await readCatalog(dataRoot)
  await rm(baseDir(dataRoot, id), { recursive: true, force: true })
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
    if (!TEXT_EXTS.has(extensionOf(entry.name))) continue
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

export async function readEntry(dataRoot: string, baseId: string, relativePath: string): Promise<ReadEntryResult> {
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath)
  try {
    return { path: relativePath, text: await readFile(absolutePath, 'utf8') }
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
  assertInside(baseDir(dataRoot, baseId), absolutePath)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, text, 'utf8')
}

export async function deleteEntry(dataRoot: string, baseId: string, relativePath: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除文件或类目需要确认')
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  assertInside(baseDir(dataRoot, baseId), absolutePath)
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath)
  await rm(absolutePath, { recursive: true, force: true })
}

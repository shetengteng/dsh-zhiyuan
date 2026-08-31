import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { BASE_ID_RE, TEXT_EXTS } from './identity.ts'
import { cleanAliases, readCatalog, removeBase, upsertBase, writeCatalog } from './catalog.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, basesRoot, resolveDest } from './paths.ts'
import type { BaseCard, BaseSummary, CreateBaseInput, TreeNode, UpdateBasePatch } from './types.ts'
import { KbError } from './types.ts'

function requireText(value: string | undefined, field: string): string {
  const text = value?.trim() ?? ''
  if (!text) throw new KbError('missing_field', `${field} 必填`)
  return text
}

function requireId(id: string): string {
  const value = requireText(id, 'id')
  if (!BASE_ID_RE.test(value)) {
    throw new KbError('invalid_id', 'id 只能是小写字母、数字、_ 或 -，最长 64')
  }
  return value
}

async function dirExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export async function scanBaseIds(dataRoot: string): Promise<string[]> {
  const root = basesRoot(dataRoot)
  if (!(await dirExists(root))) return []
  const entries = await readdir(root, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
}

async function walkDocs(dir: string): Promise<string[]> {
  const files: string[] = []
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walkDocs(path))
    else if (TEXT_EXTS.has(extOf(entry.name))) files.push(path)
  }
  return files
}

function extOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index).toLowerCase() : ''
}

export async function countDocs(dataRoot: string, baseId: string): Promise<number> {
  return (await walkDocs(baseDir(dataRoot, baseId))).length
}

async function listCategories(dataRoot: string, baseId: string): Promise<string[]> {
  const root = baseDir(dataRoot, baseId)
  if (!(await dirExists(root))) return []
  const entries = await readdir(root, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
}

function cardFromDir(id: string): BaseCard {
  return { id, title: id, description: '', aliases: [], createdAt: 0, lastUsedAt: 0 }
}

export async function listBases(dataRoot: string): Promise<BaseSummary[]> {
  const catalog = await readCatalog(dataRoot)
  const onDisk = await scanBaseIds(dataRoot)
  const byId = new Map(catalog.bases.map((card) => [card.id, card]))
  const ids = [...new Set([...onDisk, ...catalog.bases.map((card) => card.id)])]
  const summaries: BaseSummary[] = []
  for (const id of ids.sort()) {
    const card = byId.get(id) ?? cardFromDir(id)
    summaries.push({
      ...card,
      categories: await listCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedBaseId === id,
    })
  }
  return summaries
}

export async function createBase(dataRoot: string, input: CreateBaseInput): Promise<BaseCard> {
  const id = requireId(input.id)
  const title = requireText(input.title, 'title')
  const description = requireText(input.description, 'description')
  const catalog = await readCatalog(dataRoot)
  if (catalog.bases.some((card) => card.id === id) || await dirExists(baseDir(dataRoot, id))) {
    throw new KbError('base_exists', `知识库 ${id} 已存在`)
  }
  const now = Date.now()
  const card: BaseCard = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now }
  await mkdir(baseDir(dataRoot, id), { recursive: true })
  const next = upsertBase(catalog, card)
  if (!next.lastUsedBaseId) next.lastUsedBaseId = id
  if (!next.prefs.defaultBaseId) next.prefs.defaultBaseId = id
  await writeCatalog(dataRoot, next)
  return card
}

export async function updateBase(dataRoot: string, id: string, patch: UpdateBasePatch): Promise<BaseCard> {
  const catalog = await readCatalog(dataRoot)
  const current = catalog.bases.find((card) => card.id === id)
  if (!current) throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
  const card: BaseCard = {
    ...current,
    title: patch.title !== undefined ? requireText(patch.title, 'title') : current.title,
    description: patch.description !== undefined ? requireText(patch.description, 'description') : current.description,
    aliases: patch.aliases !== undefined ? cleanAliases(patch.aliases) : current.aliases,
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
  const current = catalog.bases.find((card) => card.id === id)
  if (!current) return
  current.lastUsedAt = Date.now()
  catalog.lastUsedBaseId = id
  await writeCatalog(dataRoot, catalog)
}

export async function requireBase(dataRoot: string, id: string): Promise<void> {
  const catalog = await readCatalog(dataRoot)
  if (catalog.bases.some((card) => card.id === id) || await dirExists(baseDir(dataRoot, id))) return
  throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
}

async function walkTree(root: string, dir: string): Promise<TreeNode[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nodes: TreeNode[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'zh'))) {
    const abs = join(dir, entry.name)
    const path = relative(root, abs).split(sep).join('/')
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: 'dir', path, children: await walkTree(root, abs) })
      continue
    }
    if (!TEXT_EXTS.has(extOf(entry.name))) continue
    const info = await stat(abs)
    nodes.push({ name: entry.name, kind: 'file', path, size: info.size, mtime: info.mtimeMs })
  }
  return nodes
}

export async function listTree(dataRoot: string, baseId: string): Promise<TreeNode[]> {
  await requireBase(dataRoot, baseId)
  const root = baseDir(dataRoot, baseId)
  if (!(await dirExists(root))) return []
  return walkTree(root, root)
}

export async function readEntry(dataRoot: string, baseId: string, relPath: string): Promise<{ path: string; text: string }> {
  await requireBase(dataRoot, baseId)
  const abs = resolveDest(dataRoot, baseId, relPath).absolute
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), abs)
  try {
    return { path: relPath, text: await readFile(abs, 'utf8') }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new KbError('not_found', `文件不存在：${relPath}`)
    }
    throw error
  }
}

export async function writeEntry(dataRoot: string, baseId: string, relPath: string, text: string): Promise<void> {
  await requireBase(dataRoot, baseId)
  const abs = resolveDest(dataRoot, baseId, relPath).absolute
  assertInside(baseDir(dataRoot, baseId), abs)
  await mkdir(join(abs, '..'), { recursive: true })
  await writeFile(abs, text, 'utf8')
}

export async function deleteEntry(dataRoot: string, baseId: string, relPath: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除文件或类目需要确认')
  await requireBase(dataRoot, baseId)
  const abs = resolveDest(dataRoot, baseId, relPath).absolute
  assertInside(baseDir(dataRoot, baseId), abs)
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), abs)
  await rm(abs, { recursive: true, force: true })
}

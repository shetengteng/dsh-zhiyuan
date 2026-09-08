import { randomUUID } from 'node:crypto'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { MARK_USED_THROTTLE_MS } from '../../model/constants.ts'
import type { BaseCard, Catalog, CreateBaseInput, UpdateBasePatch } from '../../model/types.ts'
import { KbError } from '../../model/types.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, basesRoot } from '../../platform/paths.ts'
import { cleanAliases, readCatalog, removeBase, upsertBase, withCatalogTx } from './catalog.ts'

// 知识库生命周期与存在性校验：创建、更新、删除、最近使用标记。

function requireNonEmptyText(value: string | undefined, field: string): string {
  const text = value?.trim() ?? ''
  if (!text) throw new KbError('missing_field', `${field} 必填`)
  return text
}

/** 同域目录/条目模块共用的目录存在性检查。 */
export async function directoryExists(directoryPath: string): Promise<boolean> {
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
  return withCatalogTx(dataRoot, async ({ catalog }) => {
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
    return { result: card, catalog: nextCatalog }
  })
}

export async function updateBase(dataRoot: string, id: string, patch: UpdateBasePatch): Promise<BaseCard> {
  return withCatalogTx(dataRoot, async ({ catalog }) => {
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
    return { result: card, catalog: upsertBase(catalog, card) }
  })
}

export async function deleteBase(dataRoot: string, id: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除知识库需要确认')
  await withCatalogTx(dataRoot, async ({ catalog }) => {
    const knownBaseIds = new Set([...catalog.bases.map((card) => card.id), ...await scanBaseIds(dataRoot)])
    if (!knownBaseIds.has(id)) throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
    const basesDirectory = basesRoot(dataRoot)
    const targetBaseDirectory = assertInside(basesDirectory, baseDir(dataRoot, id))
    assertNoSymlinkEscape(basesDirectory, targetBaseDirectory)
    await rm(targetBaseDirectory, { recursive: true, force: true })
    return { result: undefined, catalog: removeBase(catalog, id) }
  })
}

export async function markUsed(dataRoot: string, id: string): Promise<void> {
  await withCatalogTx(dataRoot, ({ catalog }) => {
    const currentCard = catalog.bases.find((card) => card.id === id)
    if (!currentCard) return { result: undefined }
    const now = Date.now()
    if (catalog.lastUsedBaseId === id && now - currentCard.lastUsedAt < MARK_USED_THROTTLE_MS) {
      return { result: undefined }
    }
    currentCard.lastUsedAt = now
    catalog.lastUsedBaseId = id
    return { result: undefined, catalog }
  })
}

export async function requireBase(dataRoot: string, id: string): Promise<void> {
  const catalog = await readCatalog(dataRoot)
  if (catalog.bases.some((card) => card.id === id) || await directoryExists(baseDir(dataRoot, id))) return
  throw new KbError('base_missing', `知识库 ${id} 不存在，请先建库`)
}

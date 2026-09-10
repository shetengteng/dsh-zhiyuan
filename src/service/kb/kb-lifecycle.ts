import { randomUUID } from 'node:crypto'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { MARK_USED_THROTTLE_MS } from '../../model/constants.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type { KbCard, Catalog } from '../../model/entity/catalog.ts'
import type { CreateKbRequest, UpdateKbRequest } from '../../model/request/kb-request.ts'
import { assertInside, assertNoSymlinkEscape, kbDir, kbsRoot } from '../../platform/paths.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { cleanAliases, removeKb, upsertKb } from './catalog-mutation.ts'

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

export async function scanKbIds(dataRoot: string): Promise<string[]> {
  const kbsDirectory = kbsRoot(dataRoot)
  if (!(await directoryExists(kbsDirectory))) return []
  const entries = await readdir(kbsDirectory, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
}

async function hasKbTitle(dataRoot: string, catalog: Catalog, title: string, excludeId?: string): Promise<boolean> {
  if (catalog.kbs.some((card) => card.id !== excludeId && card.title === title)) return true
  const catalogIds = new Set(catalog.kbs.map((card) => card.id))
  return (await scanKbIds(dataRoot)).some((id) => id !== excludeId && !catalogIds.has(id) && id.trim() === title)
}

async function generateKbId(dataRoot: string, catalog: Catalog): Promise<string> {
  const existingIds = new Set([...catalog.kbs.map((card) => card.id), ...await scanKbIds(dataRoot)])
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID()
    if (!existingIds.has(id)) return id
  }
  throw new KbError('kb_exists', '无法生成唯一知识库 ID，请重试')
}

export async function createKb(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  input: CreateKbRequest,
): Promise<KbCard> {
  const title = requireNonEmptyText(input.title, 'title')
  const description = requireNonEmptyText(input.description, 'description')
  return catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    if (await hasKbTitle(dataRoot, catalog, title)) {
      throw new KbError('title_exists', `知识库标题「${title}」已存在`)
    }
    const id = await generateKbId(dataRoot, catalog)
    const now = Date.now()
    const card: KbCard = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now }
    await mkdir(kbDir(dataRoot, id), { recursive: true })
    const nextCatalog = upsertKb(catalog, card)
    if (!nextCatalog.lastUsedKbId) nextCatalog.lastUsedKbId = id
    if (!nextCatalog.prefs.defaultKbId) nextCatalog.prefs.defaultKbId = id
    return { result: card, catalog: nextCatalog }
  })
}

export async function updateKb(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  id: string,
  patch: UpdateKbRequest,
): Promise<KbCard> {
  return catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    const currentCard = catalog.kbs.find((card) => card.id === id)
    if (!currentCard) throw new KbError('kb_missing', `知识库 ${id} 不存在，请先建库`)
    const title = patch.title !== undefined ? requireNonEmptyText(patch.title, 'title') : currentCard.title
    if (await hasKbTitle(dataRoot, catalog, title, id)) {
      throw new KbError('title_exists', `知识库标题「${title}」已存在`)
    }
    const card: KbCard = {
      ...currentCard,
      title,
      description: patch.description !== undefined ? requireNonEmptyText(patch.description, 'description') : currentCard.description,
      aliases: patch.aliases !== undefined ? cleanAliases(patch.aliases) : currentCard.aliases,
    }
    return { result: card, catalog: upsertKb(catalog, card) }
  })
}

export async function deleteKb(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  id: string,
  confirm: boolean,
): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除知识库需要确认')
  await catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    const knownKbIds = new Set([...catalog.kbs.map((card) => card.id), ...await scanKbIds(dataRoot)])
    if (!knownKbIds.has(id)) throw new KbError('kb_missing', `知识库 ${id} 不存在，请先建库`)
    const kbsDirectory = kbsRoot(dataRoot)
    const targetKbDirectory = assertInside(kbsDirectory, kbDir(dataRoot, id))
    assertNoSymlinkEscape(kbsDirectory, targetKbDirectory)
    await rm(targetKbDirectory, { recursive: true, force: true })
    return { result: undefined, catalog: removeKb(catalog, id) }
  })
}

export async function markKbUsed(catalogRepository: CatalogRepository, dataRoot: string, id: string): Promise<void> {
  await catalogRepository.withTransaction(dataRoot, ({ catalog }) => {
    const currentCard = catalog.kbs.find((card) => card.id === id)
    if (!currentCard) return { result: undefined }
    const now = Date.now()
    if (catalog.lastUsedKbId === id && now - currentCard.lastUsedAt < MARK_USED_THROTTLE_MS) {
      return { result: undefined }
    }
    currentCard.lastUsedAt = now
    catalog.lastUsedKbId = id
    return { result: undefined, catalog }
  })
}

export async function requireKb(catalogRepository: CatalogRepository, dataRoot: string, id: string): Promise<void> {
  const catalog = await catalogRepository.read(dataRoot)
  if (catalog.kbs.some((card) => card.id === id) || await directoryExists(kbDir(dataRoot, id))) return
  throw new KbError('kb_missing', `知识库 ${id} 不存在，请先建库`)
}

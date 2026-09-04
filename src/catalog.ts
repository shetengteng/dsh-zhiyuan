import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { DEFAULT_MAX_BASE_BYTES, DEFAULT_MAX_FILE_BYTES } from './identity.ts'
import type { BaseCard, Catalog, CatalogPrefs } from './types.ts'
import { catalogPath } from './paths.ts'

let catalogChain = Promise.resolve()

let catalogWarningSink: ((message: string) => void) | undefined

/** Host 启动时注入 logger，catalog 读到不支持的 version 时输出 warning。 */
export function setCatalogWarningSink(sink: (message: string) => void): void {
  catalogWarningSink = sink
}

function warnOnUnknownVersion(raw: unknown): void {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  if (record.version !== undefined && record.version !== 1) {
    catalogWarningSink?.(`catalog.json version 为 ${String(record.version)}，已按 version 1 解析`)
  }
}

export function emptyCatalog(): Catalog {
  return {
    version: 1,
    lastUsedBaseId: '',
    prefs: {
      defaultBaseId: '',
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxBaseBytes: DEFAULT_MAX_BASE_BYTES,
    },
    bases: [],
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseCard(value: unknown): BaseCard | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = asString(record.id)
  const title = asString(record.title).trim()
  if (!id) return null
  const aliases = Array.isArray(record.aliases)
    ? record.aliases.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
  const card: BaseCard = {
    id,
    title,
    description: asString(record.description),
    aliases,
    createdAt: asNumber(record.createdAt, 0),
    lastUsedAt: asNumber(record.lastUsedAt, 0),
  }
  if (typeof record.lastDestCategory === 'string') card.lastDestCategory = record.lastDestCategory
  return card
}

function parsePrefs(value: unknown): CatalogPrefs {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    defaultBaseId: asString(record.defaultBaseId),
    maxFileBytes: asNumber(record.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxBaseBytes: asNumber(record.maxBaseBytes, DEFAULT_MAX_BASE_BYTES),
  }
}

export function parseCatalog(raw: unknown): Catalog {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const bases = Array.isArray(record.bases)
    ? record.bases.map(parseCard).filter((card): card is BaseCard => Boolean(card))
    : []
  return {
    version: 1,
    lastUsedBaseId: asString(record.lastUsedBaseId),
    prefs: parsePrefs(record.prefs),
    bases,
  }
}

export async function readCatalog(dataRoot: string): Promise<Catalog> {
  try {
    const text = await readFile(catalogPath(dataRoot), 'utf8')
    const raw = JSON.parse(text) as unknown
    warnOnUnknownVersion(raw)
    return parseCatalog(raw)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return emptyCatalog()
    throw error
  }
}

/** Host 进程内 catalog 读改写的单写者。不锁文件 IO 本身。 */
export async function withCatalogLock<T>(work: () => Promise<T>): Promise<T> {
  const run = catalogChain.then(work, work)
  catalogChain = run.then(() => undefined, () => undefined)
  return run
}

export type CatalogContext = {
  dataRoot: string
  catalog: Catalog
}

/** 在写锁下读一次 catalog，执行 work，仅当 work 返回 catalog 时写入。 */
export async function withCatalogTx<T>(
  dataRoot: string,
  work: (context: CatalogContext) => Promise<{ result: T; catalog?: Catalog }> | { result: T; catalog?: Catalog },
): Promise<T> {
  return withCatalogLock(async () => {
    const catalog = await readCatalog(dataRoot)
    const outcome = await work({ dataRoot, catalog })
    if (outcome.catalog) await writeCatalog(dataRoot, outcome.catalog)
    return outcome.result
  })
}

export async function writeCatalog(dataRoot: string, catalog: Catalog): Promise<void> {
  const file = catalogPath(dataRoot)
  await mkdir(dirname(file), { recursive: true })
  const temporaryPath = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, { flag: 'wx' })
    await rename(temporaryPath, file)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw error
  }
}

export function upsertBase(catalog: Catalog, card: BaseCard): Catalog {
  const remainingCards = catalog.bases.filter((item) => item.id !== card.id)
  return { ...catalog, bases: [...remainingCards, card] }
}

export function removeBase(catalog: Catalog, id: string): Catalog {
  return {
    ...catalog,
    bases: catalog.bases.filter((item) => item.id !== id),
    lastUsedBaseId: catalog.lastUsedBaseId === id ? '' : catalog.lastUsedBaseId,
    prefs: {
      ...catalog.prefs,
      defaultBaseId: catalog.prefs.defaultBaseId === id ? '' : catalog.prefs.defaultBaseId,
    },
  }
}

export async function lastDestCategory(dataRoot: string, baseId: string): Promise<string | undefined> {
  const catalog = await readCatalog(dataRoot)
  return catalog.bases.find((card) => card.id === baseId)?.lastDestCategory
}

export async function rememberLastDest(dataRoot: string, baseId: string, destCategory: string): Promise<void> {
  await withCatalogTx(dataRoot, ({ catalog }) => {
    const currentCard = catalog.bases.find((card) => card.id === baseId)
    if (!currentCard || currentCard.lastDestCategory === destCategory) return { result: undefined }
    currentCard.lastDestCategory = destCategory
    return { result: undefined, catalog }
  })
}

export function cleanAliases(aliases: string[] | undefined): string[] {
  if (!aliases) return []
  const seen = new Set<string>()
  const cleanedAliases: string[] = []
  for (const rawAlias of aliases) {
    const value = rawAlias.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    cleanedAliases.push(value)
  }
  return cleanedAliases
}

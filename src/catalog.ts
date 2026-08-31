import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { DEFAULT_MAX_BASE_BYTES, DEFAULT_MAX_FILE_BYTES } from './identity.ts'
import type { BaseCard, Catalog, CatalogPrefs } from './types.ts'
import { catalogPath } from './paths.ts'

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
  const rec = value as Record<string, unknown>
  const id = asString(rec.id)
  const title = asString(rec.title)
  if (!id) return null
  const aliases = Array.isArray(rec.aliases)
    ? rec.aliases.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
  return {
    id,
    title,
    description: asString(rec.description),
    aliases,
    createdAt: asNumber(rec.createdAt, 0),
    lastUsedAt: asNumber(rec.lastUsedAt, 0),
    lastDestCategory: typeof rec.lastDestCategory === 'string' ? rec.lastDestCategory : undefined,
  }
}

function parsePrefs(value: unknown): CatalogPrefs {
  const rec = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    defaultBaseId: asString(rec.defaultBaseId),
    maxFileBytes: asNumber(rec.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxBaseBytes: asNumber(rec.maxBaseBytes, DEFAULT_MAX_BASE_BYTES),
  }
}

export function parseCatalog(raw: unknown): Catalog {
  const rec = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const bases = Array.isArray(rec.bases)
    ? rec.bases.map(parseCard).filter((card): card is BaseCard => Boolean(card))
    : []
  return {
    version: 1,
    lastUsedBaseId: asString(rec.lastUsedBaseId),
    prefs: parsePrefs(rec.prefs),
    bases,
  }
}

export async function readCatalog(dataRoot: string): Promise<Catalog> {
  try {
    const text = await readFile(catalogPath(dataRoot), 'utf8')
    return parseCatalog(JSON.parse(text) as unknown)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return emptyCatalog()
    throw error
  }
}

export async function writeCatalog(dataRoot: string, catalog: Catalog): Promise<void> {
  const file = catalogPath(dataRoot)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
}

export function upsertBase(catalog: Catalog, card: BaseCard): Catalog {
  const rest = catalog.bases.filter((item) => item.id !== card.id)
  return { ...catalog, bases: [...rest, card] }
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
  const catalog = await readCatalog(dataRoot)
  const current = catalog.bases.find((card) => card.id === baseId)
  if (!current || current.lastDestCategory === destCategory) return
  current.lastDestCategory = destCategory
  await writeCatalog(dataRoot, catalog)
}

export function cleanAliases(aliases: string[] | undefined): string[] {
  if (!aliases) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of aliases) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

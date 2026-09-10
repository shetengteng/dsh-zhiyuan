import { DEFAULT_MAX_KB_BYTES, DEFAULT_MAX_FILE_BYTES } from '../../model/constants.ts'
import type { KbCard, Catalog } from '../../model/entity/catalog.ts'
import type { CatalogPrefs } from '../../model/value/catalog-prefs.ts'

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseCard(value: unknown): KbCard | null {
  const record = asRecord(value)
  const id = asString(record.id)
  const title = asString(record.title).trim()
  if (!id) return null
  const aliases = Array.isArray(record.aliases)
    ? record.aliases.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
  const card: KbCard = {
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
  const record = asRecord(value)
  return {
    defaultKbId: asString(record.defaultKbId),
    maxFileBytes: asNumber(record.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxKbBytes: asNumber(record.maxKbBytes, DEFAULT_MAX_KB_BYTES),
  }
}

export function emptyCatalog(): Catalog {
  return {
    version: 2,
    lastUsedKbId: '',
    prefs: {
      defaultKbId: '',
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxKbBytes: DEFAULT_MAX_KB_BYTES,
    },
    kbs: [],
  }
}

/** 只解析已经迁移到 version 2 的 catalog 数据。 */
export function parseCatalog(raw: unknown): Catalog {
  const record = asRecord(raw)
  const kbs = Array.isArray(record.kbs)
    ? record.kbs.map(parseCard).filter((card): card is KbCard => Boolean(card))
    : []
  return {
    version: 2,
    lastUsedKbId: asString(record.lastUsedKbId),
    prefs: parsePrefs(record.prefs),
    kbs,
  }
}

export function catalogVersionWarning(raw: unknown): string | undefined {
  const version = asRecord(raw).version
  if (version === undefined || version === 2) return undefined
  return `catalog.json version 为 ${String(version)}，已按 version 2 解析`
}

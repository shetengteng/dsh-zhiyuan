import { lstat, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { parseCatalog } from './catalog-codec.ts'
import type { Catalog } from '../../model/entity/catalog.ts'

export type CatalogMigrationResult = {
  catalog: Catalog
  migrated: boolean
}

type PathKind = 'missing' | 'directory' | 'other'

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string')
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function hasLegacyFields(record: Record<string, unknown>, prefs: Record<string, unknown>): boolean {
  return hasOwn(record, 'lastUsedBaseId')
    || hasOwn(record, 'bases')
    || hasOwn(prefs, 'defaultBaseId')
    || hasOwn(prefs, 'maxBaseBytes')
}

/** 将旧 catalog 或混入旧字段的 catalog 转换为唯一的 version 2 schema。 */
export function migrateCatalog(raw: unknown): CatalogMigrationResult {
  const record = asRecord(raw)
  const oldPrefs = asRecord(record.prefs)
  if (record.version === 2 && !hasLegacyFields(record, oldPrefs)) {
    return { catalog: parseCatalog(raw), migrated: false }
  }
  const canonicalRaw = {
    version: 2,
    lastUsedKbId: firstString(record.lastUsedKbId, record.lastUsedBaseId) ?? '',
    prefs: {
      defaultKbId: firstString(oldPrefs.defaultKbId, oldPrefs.defaultBaseId) ?? '',
      maxFileBytes: oldPrefs.maxFileBytes,
      maxKbBytes: firstDefined(oldPrefs.maxKbBytes, oldPrefs.maxBaseBytes),
    },
    kbs: Array.isArray(record.kbs) ? record.kbs : record.bases,
  }
  return { catalog: parseCatalog(canonicalRaw), migrated: true }
}

async function pathKind(path: string): Promise<PathKind> {
  try {
    const info = await lstat(path)
    return info.isDirectory() ? 'directory' : 'other'
  } catch (error) {
    if (error !== null && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT') return 'missing'
    throw error
  }
}

/** 一次性将旧磁盘根目录改名；双目录时拒绝自动合并，避免静默覆盖资料。 */
export async function migrateLegacyDirectories(dataRoot: string): Promise<void> {
  const legacyDirectory = join(dataRoot, 'bases')
  const currentDirectory = join(dataRoot, 'kbs')
  const legacyKind = await pathKind(legacyDirectory)
  const currentKind = await pathKind(currentDirectory)
  if (legacyKind === 'other' || currentKind === 'other') {
    throw new Error('知识库目录迁移失败：bases/ 或 kbs/ 不是目录')
  }
  if (legacyKind === 'directory' && currentKind === 'directory') {
    throw new Error('知识库目录迁移冲突：bases/ 与 kbs/ 同时存在，请先人工合并后重试')
  }
  if (legacyKind === 'directory') await rename(legacyDirectory, currentDirectory)
}

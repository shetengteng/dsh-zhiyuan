import { createBase, deleteBase, deleteEntry, listBases, listTree, readEntry, requireBase, updateBase, writeEntry } from './bases.ts'
import { readCatalog, writeCatalog } from './catalog.ts'
import { EntryPreviewView, isEntryPreviewView, type EntryPreviewOptions } from './content/host-api.ts'
import { ingest } from './ingest.ts'
import type { JobRunner } from './jobs.ts'
import { resolveDataRoot } from './paths.ts'
import { pickSource } from './pick-source.ts'
import { searchBase } from './search.ts'
import { KbError } from './types.ts'

type JsonRecord = Record<string, unknown>

const MAX_PREF_FILE_BYTES = 1024 * 1024 * 1024
const MAX_PREF_BASE_BYTES = 10 * 1024 * 1024 * 1024 * 1024

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new KbError('missing_field', '请求参数必须是对象')
  }
  return value as JsonRecord
}

function hasField(data: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

function requireString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (typeof value !== 'string') throw new KbError('missing_field', `${field} 必填`)
  return value
}

function optionalString(data: JsonRecord, field: string): string | undefined {
  if (!hasField(data, field)) return undefined
  return requireString(data, field)
}

function optionalStringArray(data: JsonRecord, field: string): string[] | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new KbError('missing_field', `${field} 必须是字符串数组`)
  }
  return value
}

function optionalBoolean(data: JsonRecord, field: string, fallback: boolean): boolean {
  if (!hasField(data, field)) return fallback
  if (typeof data[field] !== 'boolean') throw new KbError('missing_field', `${field} 必须是布尔值`)
  return data[field]
}

function optionalPositiveInteger(data: JsonRecord, field: string): number | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError('missing_field', `${field} 必须是正整数`)
  }
  return value
}

function readPreviewOptions(data: JsonRecord): EntryPreviewOptions {
  if (!hasField(data, 'view')) return {}
  if (!isEntryPreviewView(data.view)) throw new KbError('invalid_preview', '预览模式无效')
  if (data.view === EntryPreviewView.Tree) return { view: data.view }
  const matchLine = optionalPositiveInteger(data, 'matchLine')
  if (matchLine === undefined) throw new KbError('invalid_preview', '搜索预览缺少有效命中行')
  const matchColumnByte = optionalPositiveInteger(data, 'matchColumnByte')
  const sourceFingerprint = optionalString(data, 'sourceFingerprint')
  if (sourceFingerprint !== undefined && sourceFingerprint.length > 128) {
    throw new KbError('invalid_preview', '搜索预览文件指纹无效')
  }
  return { view: data.view, matchLine, matchColumnByte, sourceFingerprint }
}

async function setPrefs(dataRoot: string, data: JsonRecord): Promise<unknown> {
  const catalog = await readCatalog(dataRoot)
  const defaultBaseId = optionalString(data, 'defaultBaseId')
  const maxFileBytes = optionalPositiveInteger(data, 'maxFileBytes')
  const maxBaseBytes = optionalPositiveInteger(data, 'maxBaseBytes')
  const nextPrefs = {
    defaultBaseId: defaultBaseId ?? catalog.prefs.defaultBaseId,
    maxFileBytes: maxFileBytes ?? catalog.prefs.maxFileBytes,
    maxBaseBytes: maxBaseBytes ?? catalog.prefs.maxBaseBytes,
  }
  if (nextPrefs.maxFileBytes > MAX_PREF_FILE_BYTES || nextPrefs.maxBaseBytes > MAX_PREF_BASE_BYTES) {
    throw new KbError('quota', '偏好额度超出允许范围')
  }
  if (nextPrefs.maxFileBytes > nextPrefs.maxBaseBytes) {
    throw new KbError('quota', '单文件上限不能大于单库上限')
  }
  if (nextPrefs.defaultBaseId) await requireBase(dataRoot, nextPrefs.defaultBaseId)
  catalog.prefs = nextPrefs
  await writeCatalog(dataRoot, catalog)
  return catalog.prefs
}

/**
 * Executes the allowlisted operations used by the settings workbench and
 * in-memory entry previews. The caller is untrusted; every field is narrowed
 * before it reaches the catalog or filesystem boundary.
 */
export async function executeKnowledgeOperation(payload: unknown, jobs: JobRunner): Promise<unknown> {
  const data = asRecord(payload)
  const operation = requireString(data, 'op')
  const dataRoot = await resolveDataRoot()
  switch (operation) {
    case 'list':
      return listBases(dataRoot)
    case 'create':
      return createBase(dataRoot, {
        title: requireString(data, 'title'),
        description: requireString(data, 'description'),
        aliases: optionalStringArray(data, 'aliases') ?? [],
      })
    case 'update':
      return updateBase(dataRoot, requireString(data, 'id'), {
        title: optionalString(data, 'title'),
        description: optionalString(data, 'description'),
        aliases: optionalStringArray(data, 'aliases'),
      })
    case 'deleteBase':
      await deleteBase(dataRoot, requireString(data, 'id'), optionalBoolean(data, 'confirm', false))
      return { ok: true }
    case 'tree':
      return listTree(dataRoot, requireString(data, 'id'))
    case 'read':
      return readEntry(dataRoot, requireString(data, 'id'), requireString(data, 'path'), readPreviewOptions(data))
    case 'write':
      await writeEntry(dataRoot, requireString(data, 'id'), requireString(data, 'path'), requireString(data, 'text'))
      return { ok: true }
    case 'deleteEntry':
      await deleteEntry(dataRoot, requireString(data, 'id'), requireString(data, 'path'), optionalBoolean(data, 'confirm', false))
      return { ok: true }
    case 'pick': {
      const kind = requireString(data, 'kind')
      if (kind !== 'file' && kind !== 'dir') throw new KbError('missing_field', 'kind 必须是 file 或 dir')
      return pickSource(kind)
    }
    case 'ingest':
      return jobs.enqueue('ingest', () => ingest(dataRoot, {
        baseId: requireString(data, 'baseId'),
        sourcePath: requireString(data, 'sourcePath'),
        destCategory: requireString(data, 'destCategory'),
        preserveTree: optionalBoolean(data, 'preserveTree', false),
        createMissing: optionalBoolean(data, 'createMissing', true),
      }))
    case 'search':
      return searchBase(dataRoot, {
        baseId: requireString(data, 'baseId'),
        query: requireString(data, 'query'),
        aliases: optionalStringArray(data, 'aliases'),
        category: optionalString(data, 'category'),
        topK: optionalPositiveInteger(data, 'topK'),
      })
    case 'prefs':
      return (await readCatalog(dataRoot)).prefs
    case 'setPrefs':
      return setPrefs(dataRoot, data)
    default:
      throw new KbError('missing_field', `未知操作 ${operation}`)
  }
}

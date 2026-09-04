import { createBase, deleteBase, deleteEntry, listBases, listTree, readEntry, readEntryPage, requireBase, updateBase, writeEntryContent } from './bases.ts'
import { readCatalog, withCatalogTx } from './catalog.ts'
import { EntryPreviewView, EntryReadMode, isEntryPreviewView, isEntryReadMode, parseEntryWriteChange, type EntryPreviewOptions } from './content/host-api.ts'
import { buildIngestInput, ingest } from './ingest.ts'
import { ingestDroppedBytes } from './ingest-dropped.ts'
import { TABLE_EDITOR_PAGE_SIZE } from './identity.ts'
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
    throw new KbError('invalid_field', '请求参数必须是对象')
  }
  return value as JsonRecord
}

function hasField(data: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

function requireString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (value === undefined) throw new KbError('missing_field', `${field} 必填`)
  if (typeof value !== 'string') throw new KbError('invalid_field', `${field} 必须是字符串`)
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
    throw new KbError('invalid_field', `${field} 必须是字符串数组`)
  }
  return value
}

function optionalBoolean(data: JsonRecord, field: string, fallback: boolean): boolean {
  if (!hasField(data, field)) return fallback
  const value = data[field]
  if (typeof value !== 'boolean') throw new KbError('invalid_field', `${field} 必须是布尔值`)
  return value
}

function optionalPositiveInteger(data: JsonRecord, field: string): number | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError('invalid_field', `${field} 必须是正整数`)
  }
  return value
}

function readPreviewOptions(data: JsonRecord): EntryPreviewOptions {
  const readMode = hasField(data, 'readMode') ? data.readMode : EntryReadMode.Preview
  if (!isEntryReadMode(readMode)) throw new KbError('invalid_preview', '读取模式无效')
  if (!hasField(data, 'view')) return { readMode }
  if (!isEntryPreviewView(data.view)) throw new KbError('invalid_preview', '预览模式无效')
  if (data.view === EntryPreviewView.Tree) return { view: data.view, readMode }
  if (readMode === EntryReadMode.Edit) throw new KbError('invalid_preview', '搜索命中不能进入编辑模式')
  const matchLine = optionalPositiveInteger(data, 'matchLine')
  if (matchLine === undefined) throw new KbError('invalid_preview', '搜索预览缺少有效命中行')
  const matchColumnByte = optionalPositiveInteger(data, 'matchColumnByte')
  const sourceFingerprint = optionalString(data, 'sourceFingerprint')
  if (sourceFingerprint !== undefined && sourceFingerprint.length > 128) {
    throw new KbError('invalid_preview', '搜索预览文件指纹无效')
  }
  return { view: data.view, readMode, matchLine, matchColumnByte, sourceFingerprint }
}

async function setPrefs(dataRoot: string, data: JsonRecord): Promise<unknown> {
  return withCatalogTx(dataRoot, async ({ catalog }) => {
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
    return { result: catalog.prefs, catalog }
  })
}

/**
 * 执行设置工作台与条目预览白名单操作。调用方不可信；
 * 每个字段在进入 catalog 或文件系统边界前都要收窄。
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
    case 'readPage':
      return readEntryPage(
        dataRoot,
        requireString(data, 'id'),
        requireString(data, 'path'),
        optionalPositiveInteger(data, 'startRow') ?? 1,
        optionalPositiveInteger(data, 'pageSize') ?? TABLE_EDITOR_PAGE_SIZE,
      )
    case 'write':
      await writeEntryContent(dataRoot, requireString(data, 'id'), requireString(data, 'path'), parseEntryWriteChange(data.change))
      return { ok: true }
    case 'deleteEntry':
      await deleteEntry(dataRoot, requireString(data, 'id'), requireString(data, 'path'), optionalBoolean(data, 'confirm', false))
      return { ok: true }
    case 'pick': {
      const kind = requireString(data, 'kind')
      if (kind !== 'file' && kind !== 'dir') throw new KbError('invalid_field', 'kind 必须是 file 或 dir')
      return pickSource(kind)
    }
    case 'ingest': {
      const sourceBase64 = optionalString(data, 'sourceBase64')
      if (sourceBase64 !== undefined) {
        return jobs.enqueue('ingest', () => ingestDroppedBytes(dataRoot, {
          baseId: requireString(data, 'baseId'),
          destCategory: requireString(data, 'destCategory'),
          fileName: requireString(data, 'sourceName'),
          bytes: Buffer.from(sourceBase64, 'base64'),
          preserveTree: optionalBoolean(data, 'preserveTree', false),
          createMissing: optionalBoolean(data, 'createMissing', true),
        }))
      }
      return jobs.enqueue('ingest', () => ingest(dataRoot, buildIngestInput({
        baseId: requireString(data, 'baseId'),
        sourcePath: requireString(data, 'sourcePath'),
        destCategory: requireString(data, 'destCategory'),
        preserveTree: optionalBoolean(data, 'preserveTree', false),
        createMissing: optionalBoolean(data, 'createMissing', true),
      })))
    }
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
      throw new KbError('unknown_op', `未知操作 ${operation}`)
  }
}

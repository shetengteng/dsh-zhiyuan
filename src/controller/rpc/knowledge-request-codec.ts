import { EntryPreviewView, EntryReadMode, isEntryPreviewView, isEntryReadMode, parseEntryWriteChange, type EntryPreviewOptions } from '../../content/host-api.ts'
import { TABLE_EDITOR_PAGE_SIZE } from '../../model/constants.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type { KnowledgeOperationRequest } from '../../model/wire/knowledge-operation.ts'

export type JsonRecord = Record<string, unknown>

type KnowledgeImportOperation = Extract<KnowledgeOperationRequest, { op: 'import' }>
type KnowledgeSearchOperation = Extract<KnowledgeOperationRequest, { op: 'search' }>

export function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new KbError('invalid_field', '请求参数必须是对象')
  }
  return value as JsonRecord
}

export function hasField(data: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

export function requireString(data: JsonRecord, field: string): string {
  const value = data[field]
  if (value === undefined) throw new KbError('missing_field', `${field} 必填`)
  if (typeof value !== 'string') throw new KbError('invalid_field', `${field} 必须是字符串`)
  return value
}

export function optionalString(data: JsonRecord, field: string): string | undefined {
  if (!hasField(data, field)) return undefined
  return requireString(data, field)
}

export function optionalStringArray(data: JsonRecord, field: string): string[] | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new KbError('invalid_field', `${field} 必须是字符串数组`)
  }
  return value
}

export function optionalBoolean(data: JsonRecord, field: string, fallback: boolean): boolean {
  if (!hasField(data, field)) return fallback
  const value = data[field]
  if (typeof value !== 'boolean') throw new KbError('invalid_field', `${field} 必须是布尔值`)
  return value
}

export function optionalPositiveInteger(data: JsonRecord, field: string): number | undefined {
  if (!hasField(data, field)) return undefined
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError('invalid_field', `${field} 必须是正整数`)
  }
  return value
}

export function readPreviewOptions(data: JsonRecord): EntryPreviewOptions {
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

export function decodeImportOperation(data: JsonRecord): KnowledgeImportOperation {
  if (hasField(data, 'sourceBase64')) {
    const sourceBase64 = requireString(data, 'sourceBase64')
    const kbId = requireString(data, 'kbId')
    const destCategory = requireString(data, 'destCategory')
    const sourceName = requireString(data, 'sourceName')
    const preserveTree = optionalBoolean(data, 'preserveTree', false)
    const createMissing = optionalBoolean(data, 'createMissing', true)
    return { op: 'import', kbId, destCategory, sourceName, sourceBase64, preserveTree, createMissing }
  }
  const kbId = requireString(data, 'kbId')
  const sourcePath = requireString(data, 'sourcePath')
  const destCategory = requireString(data, 'destCategory')
  const preserveTree = optionalBoolean(data, 'preserveTree', false)
  const createMissing = optionalBoolean(data, 'createMissing', true)
  return { op: 'import', kbId, sourcePath, destCategory, preserveTree, createMissing }
}

function decodeSearchOperation(data: JsonRecord): KnowledgeSearchOperation {
  if (hasField(data, 'cursor')) {
    if (['kbId', 'query', 'aliases', 'category', 'path'].some((field) => hasField(data, field))) {
      throw new KbError('invalid_field', '续页请求只能包含 cursor 和 limit')
    }
    const cursor = requireString(data, 'cursor')
    const limit = optionalPositiveInteger(data, 'limit')
    return { op: 'search', cursor, ...(limit === undefined ? {} : { limit }) }
  }
  const kbId = requireString(data, 'kbId')
  const query = requireString(data, 'query')
  const aliases = optionalStringArray(data, 'aliases')
  const category = optionalString(data, 'category')
  const path = optionalString(data, 'path')
  const limit = optionalPositiveInteger(data, 'limit')
  return {
    op: 'search',
    kbId,
    query,
    ...(aliases === undefined ? {} : { aliases }),
    ...(category === undefined ? {} : { category }),
    ...(path === undefined ? {} : { path }),
    ...(limit === undefined ? {} : { limit }),
  }
}

/** 将未知 RPC payload 收窄为已校验的 operation 请求。 */
export function decodeKnowledgeOperation(payload: unknown): KnowledgeOperationRequest {
  const data = asRecord(payload)
  const operation = requireString(data, 'op')
  switch (operation) {
    case 'list':
      return { op: 'list' }
    case 'create':
      return {
        op: 'create',
        title: requireString(data, 'title'),
        description: requireString(data, 'description'),
        aliases: optionalStringArray(data, 'aliases') ?? [],
      }
    case 'update': {
      const id = requireString(data, 'id')
      const title = optionalString(data, 'title')
      const description = optionalString(data, 'description')
      const aliases = optionalStringArray(data, 'aliases')
      return {
        op: 'update',
        id,
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
        ...(aliases === undefined ? {} : { aliases }),
      }
    }
    case 'deleteKb':
      return { op: 'deleteKb', id: requireString(data, 'id'), confirm: optionalBoolean(data, 'confirm', false) }
    case 'tree':
      return { op: 'tree', id: requireString(data, 'id') }
    case 'read':
      return {
        op: 'read',
        id: requireString(data, 'id'),
        path: requireString(data, 'path'),
        ...readPreviewOptions(data),
      }
    case 'readPage':
      return {
        op: 'readPage',
        id: requireString(data, 'id'),
        path: requireString(data, 'path'),
        startRow: optionalPositiveInteger(data, 'startRow') ?? 1,
        pageSize: optionalPositiveInteger(data, 'pageSize') ?? TABLE_EDITOR_PAGE_SIZE,
      }
    case 'write':
      return {
        op: 'write',
        id: requireString(data, 'id'),
        path: requireString(data, 'path'),
        change: parseEntryWriteChange(data.change),
      }
    case 'deleteEntry':
      return { op: 'deleteEntry', id: requireString(data, 'id'), path: requireString(data, 'path'), confirm: optionalBoolean(data, 'confirm', false) }
    case 'pick': {
      const kind = requireString(data, 'kind')
      if (kind !== 'file' && kind !== 'dir') throw new KbError('invalid_field', 'kind 必须是 file 或 dir')
      return { op: 'pick', kind }
    }
    case 'import':
      return decodeImportOperation(data)
    case 'search':
      return decodeSearchOperation(data)
    case 'prefs':
      return { op: 'prefs' }
    case 'setPrefs': {
      const defaultKbId = optionalString(data, 'defaultKbId')
      const maxFileBytes = optionalPositiveInteger(data, 'maxFileBytes')
      const maxKbBytes = optionalPositiveInteger(data, 'maxKbBytes')
      return {
        op: 'setPrefs',
        ...(defaultKbId === undefined ? {} : { defaultKbId }),
        ...(maxFileBytes === undefined ? {} : { maxFileBytes }),
        ...(maxKbBytes === undefined ? {} : { maxKbBytes }),
      }
    }
    default:
      throw new KbError('unknown_op', `未知操作 ${operation}`)
  }
}

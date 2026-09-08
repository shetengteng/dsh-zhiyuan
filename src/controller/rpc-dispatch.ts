import { parseEntryWriteChange } from '../content/host-api.ts'
import { TABLE_EDITOR_PAGE_SIZE } from '../model/constants.ts'
import { KbError } from '../model/types.ts'
import type { JobRunner } from '../platform/jobs.ts'
import { resolveDataRoot } from '../platform/paths.ts'
import { listBases, listTree } from '../service/kb/base-tree.ts'
import { createBase, deleteBase, requireBase, updateBase } from '../service/kb/bases.ts'
import { readCatalog, withCatalogTx } from '../service/kb/catalog.ts'
import { deleteEntry, readEntry, readEntryPage, writeEntryContent } from '../service/kb/entry.ts'
import { buildImportInput, importFiles } from '../service/kb/import.ts'
import { importDroppedBytes } from '../service/kb/import-drop.ts'
import { pickSource } from '../service/kb/pick-file.ts'
import { searchBase } from '../service/search/index.ts'
import { asRecord, hasField, optionalBoolean, optionalPositiveInteger, optionalString, optionalStringArray, readPreviewOptions, requireString, type JsonRecord } from './rpc-input.ts'

const MAX_PREF_FILE_BYTES = 1024 * 1024 * 1024
const MAX_PREF_BASE_BYTES = 10 * 1024 * 1024 * 1024 * 1024

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
    case 'import': {
      const sourceBase64 = optionalString(data, 'sourceBase64')
      if (sourceBase64 !== undefined) {
        return jobs.enqueue('import', () => importDroppedBytes(dataRoot, {
          baseId: requireString(data, 'baseId'),
          destCategory: requireString(data, 'destCategory'),
          fileName: requireString(data, 'sourceName'),
          bytes: Buffer.from(sourceBase64, 'base64'),
          preserveTree: optionalBoolean(data, 'preserveTree', false),
          createMissing: optionalBoolean(data, 'createMissing', true),
        }))
      }
      return jobs.enqueue('import', () => importFiles(dataRoot, buildImportInput({
        baseId: requireString(data, 'baseId'),
        sourcePath: requireString(data, 'sourcePath'),
        destCategory: requireString(data, 'destCategory'),
        preserveTree: optionalBoolean(data, 'preserveTree', false),
        createMissing: optionalBoolean(data, 'createMissing', true),
      })))
    }
    case 'search': {
      if (hasField(data, 'cursor')) {
        return searchBase(dataRoot, {
          cursor: requireString(data, 'cursor'),
          ...(optionalPositiveInteger(data, 'limit') === undefined ? {} : { limit: optionalPositiveInteger(data, 'limit') }),
        })
      }
      return searchBase(dataRoot, {
        baseId: requireString(data, 'baseId'),
        query: requireString(data, 'query'),
        aliases: optionalStringArray(data, 'aliases'),
        category: optionalString(data, 'category'),
        path: optionalString(data, 'path'),
        ...(optionalPositiveInteger(data, 'limit') === undefined ? {} : { limit: optionalPositiveInteger(data, 'limit') }),
      })
    }
    case 'prefs':
      return (await readCatalog(dataRoot)).prefs
    case 'setPrefs':
      return setPrefs(dataRoot, data)
    default:
      throw new KbError('unknown_op', `未知操作 ${operation}`)
  }
}

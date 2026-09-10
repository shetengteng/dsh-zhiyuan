import { TABLE_EDITOR_PAGE_SIZE } from '../../model/constants.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type { KnowledgeOperationResponse } from '../../model/wire/knowledge-operation.ts'
import type { JobRunner } from '../../platform/jobs.ts'
import { resolveDataRoot } from '../../platform/paths.ts'
import type { KnowledgeServices } from '../../service/kb/knowledge-services.ts'
import { pickSource } from '../../service/kb/pick-file.ts'
import { mapImportOperationToRequest, mapSearchOperationToRequest, mapSetPrefsOperationToRequest } from './knowledge-operation-request-mapper.ts'
import { asRecord, decodeImportOperation, decodeKnowledgeOperation, optionalString, requireString } from './knowledge-request-codec.ts'

/**
 * 执行设置工作台与条目预览白名单操作。调用方不可信；
 * 每个字段在进入 catalog 或文件系统边界前都要收窄。
 */
export async function executeKnowledgeOperation(
  payload: unknown,
  jobs: JobRunner,
  knowledgeServices: KnowledgeServices,
): Promise<KnowledgeOperationResponse> {
  const data = asRecord(payload)
  const operation = requireString(data, 'op')
  const dataRoot = await resolveDataRoot()
  if (operation === 'import') {
    optionalString(data, 'sourceBase64')
    return knowledgeServices.enqueueKnowledgeImport(dataRoot, jobs, () => mapImportOperationToRequest(decodeImportOperation(data)))
  }
  const request = decodeKnowledgeOperation(data)
  switch (request.op) {
    case 'list':
      return knowledgeServices.listKbs(dataRoot)
    case 'create':
      return knowledgeServices.createKb(dataRoot, {
        title: request.title,
        description: request.description,
        aliases: request.aliases ?? [],
      })
    case 'update':
      return knowledgeServices.updateKb(dataRoot, request.id, {
        title: request.title,
        description: request.description,
        aliases: request.aliases,
      })
    case 'deleteKb':
      await knowledgeServices.deleteKb(dataRoot, request.id, request.confirm ?? false)
      return { ok: true }
    case 'tree':
      return knowledgeServices.listTree(dataRoot, request.id)
    case 'read':
      return knowledgeServices.readEntry(dataRoot, request.id, request.path, request)
    case 'readPage':
      return knowledgeServices.readEntryPage(dataRoot, request.id, request.path, request.startRow ?? 1, request.pageSize ?? TABLE_EDITOR_PAGE_SIZE)
    case 'write':
      await knowledgeServices.writeEntryContent(dataRoot, request.id, request.path, request.change)
      return { ok: true }
    case 'deleteEntry':
      await knowledgeServices.deleteEntry(dataRoot, request.id, request.path, request.confirm ?? false)
      return { ok: true }
    case 'pick':
      return pickSource(request.kind)
    case 'search':
      return knowledgeServices.searchKb(dataRoot, mapSearchOperationToRequest(request))
    case 'prefs':
      return knowledgeServices.getPreferences(dataRoot)
    case 'setPrefs':
      return knowledgeServices.updatePreferences(dataRoot, mapSetPrefsOperationToRequest(request))
    default:
      throw new KbError('unknown_op', `未知操作 ${operation}`)
  }
}

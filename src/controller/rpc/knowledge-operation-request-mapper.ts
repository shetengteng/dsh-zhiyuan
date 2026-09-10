import { Buffer } from 'node:buffer'
import { createImportFromPathRequest, type ImportRequest } from '../../model/request/import-request.ts'
import type { UpdatePreferencesRequest } from '../../model/request/preferences-request.ts'
import type { SearchRequest } from '../../model/request/search-request.ts'
import type { KnowledgeOperationRequestFor } from '../../model/wire/knowledge-operation.ts'

type KnowledgeImportOperation = KnowledgeOperationRequestFor<'import'>
type KnowledgeSearchOperation = KnowledgeOperationRequestFor<'search'>
type KnowledgeSetPrefsOperation = KnowledgeOperationRequestFor<'setPrefs'>

/** 移除 RPC wire 的 op 与 base64 表示，映射为导入用例请求。 */
export function mapImportOperationToRequest(operation: KnowledgeImportOperation): ImportRequest {
  if ('sourceBase64' in operation) {
    return {
      kbId: operation.kbId,
      destCategory: operation.destCategory,
      fileName: operation.sourceName,
      bytes: Buffer.from(operation.sourceBase64, 'base64'),
      preserveTree: operation.preserveTree,
      createMissing: operation.createMissing,
    }
  }
  return createImportFromPathRequest({
    kbId: operation.kbId,
    sourcePath: operation.sourcePath,
    destCategory: operation.destCategory,
    preserveTree: operation.preserveTree,
    createMissing: operation.createMissing,
  })
}

/** 移除 RPC wire 的 op，映射为检索服务的判别请求。 */
export function mapSearchOperationToRequest(operation: KnowledgeSearchOperation): SearchRequest {
  if ('cursor' in operation) {
    return {
      cursor: operation.cursor,
      ...(operation.limit === undefined ? {} : { limit: operation.limit }),
    }
  }
  return {
    kbId: operation.kbId,
    query: operation.query,
    ...(operation.aliases === undefined ? {} : { aliases: operation.aliases }),
    ...(operation.category === undefined ? {} : { category: operation.category }),
    ...(operation.path === undefined ? {} : { path: operation.path }),
    ...(operation.limit === undefined ? {} : { limit: operation.limit }),
  }
}

/** 移除 RPC wire 的 op，映射为偏好更新应用请求。 */
export function mapSetPrefsOperationToRequest(operation: KnowledgeSetPrefsOperation): UpdatePreferencesRequest {
  return {
    ...(operation.defaultKbId === undefined ? {} : { defaultKbId: operation.defaultKbId }),
    ...(operation.maxFileBytes === undefined ? {} : { maxFileBytes: operation.maxFileBytes }),
    ...(operation.maxKbBytes === undefined ? {} : { maxKbBytes: operation.maxKbBytes }),
  }
}

import { KbError } from '../../model/error/kb-error.ts'
import { createImportFromPathRequest, type ImportFromPathRequest } from '../../model/request/import-request.ts'
import type { SearchRequest } from '../../model/request/search-request.ts'
import type { JsonRecord } from '../../platform/field-reader.ts'
import { booleanOr, optionalNumber, optionalString, optionalStringArray, requireNonEmptyString } from '../../platform/field-reader.ts'

// Tool 渠道请求映射：宽松记录收窄走共享原语，只保留 Tool 特有的字段规则。

/** 保留 Tool 的宽松原始字段回退，再映射到路径导入应用请求。 */
export function buildToolImportInput(data: JsonRecord): ImportFromPathRequest {
  return createImportFromPathRequest({
    kbId: requireNonEmptyString(data, 'kbId'),
    sourcePath: requireNonEmptyString(data, 'sourcePath'),
    destCategory: typeof data.destCategory === 'string' ? data.destCategory : '',
    preserveTree: booleanOr(data.preserveTree, false),
    createMissing: booleanOr(data.createMissing, true),
  })
}

/** 保留 Tool 的字段收窄规则，再映射到检索应用请求。 */
export function buildToolSearchRequest(data: JsonRecord): SearchRequest {
  const limit = optionalNumber(data, 'limit')
  if (data.cursor !== undefined) {
    if (['kbId', 'query', 'aliases', 'category', 'path'].some((field) => Object.prototype.hasOwnProperty.call(data, field))) {
      throw new KbError('invalid_field', '续页请求只能包含 cursor 和 limit')
    }
    return {
      cursor: requireNonEmptyString(data, 'cursor'),
      ...(limit === undefined ? {} : { limit }),
    }
  }
  return {
    kbId: requireNonEmptyString(data, 'kbId'),
    query: requireNonEmptyString(data, 'query'),
    aliases: optionalStringArray(data, 'aliases'),
    category: optionalString(data, 'category'),
    path: optionalString(data, 'path'),
    ...(limit === undefined ? {} : { limit }),
  }
}

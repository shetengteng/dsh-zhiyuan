import type { SearchRequest } from '../../model/request/search-request.ts'
import type { SearchResult } from '../../model/response/search-response.ts'
import type { SearchKbAccess } from './kb-access.ts'
import { searchKb as executeSearchKb } from './index.ts'

/** 知识库检索应用适配器通过 SearchKbAccess 组合库状态与搜索领域服务。 */
export async function searchKb(
  dataRoot: string,
  input: SearchRequest,
  kbAccess: SearchKbAccess,
): Promise<SearchResult> {
  return executeSearchKb(dataRoot, input, kbAccess)
}

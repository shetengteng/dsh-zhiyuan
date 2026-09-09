import type { SearchResult } from '../model/search-result.ts'
import { markUsed, requireBase } from '../service/kb/bases.ts'
import { searchBase, type SearchRequest } from '../service/search/index.ts'
import type { SearchBaseAccess } from '../service/search/base-access.ts'

function createSearchBaseAccess(dataRoot: string): SearchBaseAccess {
  return {
    ensureBase: (baseId) => requireBase(dataRoot, baseId),
    markBaseUsed: (baseId) => markUsed(dataRoot, baseId),
  }
}

/** 控制器负责组合知识库状态与搜索领域服务。 */
export async function searchKnowledgeBase(dataRoot: string, input: SearchRequest): Promise<SearchResult> {
  return searchBase(dataRoot, input, createSearchBaseAccess(dataRoot))
}

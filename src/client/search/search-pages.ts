import type { SearchResult } from '../models.ts'

export function appendSearchPage(previous: SearchResult, next: SearchResult): SearchResult {
  if (previous.kind !== next.kind || previous.scope !== next.scope || previous.baseId !== next.baseId) {
    throw new Error('搜索分页作用域不一致')
  }
  if (previous.kind === 'overview' && next.kind === 'overview') {
    return {
      ...next,
      files: [...previous.files, ...next.files],
      page: { ...next.page, returnedFiles: previous.files.length + next.files.length },
    }
  }
  if (previous.kind === 'file-detail' && next.kind === 'file-detail' && previous.path === next.path) {
    return {
      ...next,
      hits: [...previous.hits, ...next.hits],
      page: { ...next.page, returnedHits: previous.hits.length + next.hits.length },
    }
  }
  throw new Error('搜索分页目标文件不一致')
}

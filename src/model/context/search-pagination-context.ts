/** 搜索分页编解码使用的内部位置。 */
export type SearchPagePosition = {
  fileIndex: number
  hitIndex: number
}

/** 搜索分组中尚未展示的文件计数。 */
export type RestFileCount = {
  path: string
  count: number
}

/** v4 搜索游标中的已规范化查询上下文。 */
export type SearchCursorQuery = {
  kbId: string
  terms: string[]
  aliases: string[]
  category?: string
  path?: string
}

/** v4 搜索游标的可序列化内部载荷。 */
export type SearchCursorPayload =
  | {
      version: 4
      scope: 'files'
      query: Omit<SearchCursorQuery, 'path'>
      position: { fileIndex: number }
    }
  | {
      version: 4
      scope: 'hits'
      query: SearchCursorQuery & { path: string }
      position: { hitIndex: number }
    }

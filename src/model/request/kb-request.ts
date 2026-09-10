/** 创建知识库的应用请求。 */
export type CreateKbRequest = {
  title: string
  description: string
  aliases?: string[]
}

/** 更新知识库的应用请求。 */
export type UpdateKbRequest = {
  title?: string
  description?: string
  aliases?: string[]
}

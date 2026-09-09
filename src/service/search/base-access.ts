/** 搜索域声明所需的知识库访问能力，不直接依赖知识库域实现。 */
export type SearchBaseAccess = {
  ensureBase: (baseId: string) => Promise<void>
  markBaseUsed: (baseId: string) => Promise<void>
}

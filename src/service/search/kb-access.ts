/** 搜索域声明所需的知识库访问能力，不直接依赖知识库域实现。 */
export type SearchKbAccess = {
  ensureKb: (kbId: string) => Promise<void>
  markKbUsed: (kbId: string) => Promise<void>
}

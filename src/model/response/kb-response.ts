import type { KbCard } from '../entity/catalog.ts'

/** 知识库列表中面向调用方的投影。 */
export type KbSummaryResponse = KbCard & {
  categories: string[]
  approxDocs: number
  lastUsed: boolean
}

/** 知识库目录树中面向调用方的节点投影。 */
export type KbTreeNodeResponse = {
  name: string
  kind: 'dir' | 'file'
  path: string
  size?: number
  mtime?: number
  children?: KbTreeNodeResponse[]
}

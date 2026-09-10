import type { Catalog } from '../entity/catalog.ts'

/** catalog 单写者事务内使用的 Host 私有上下文。 */
export type CatalogTransactionContext = {
  dataRoot: string
  catalog: Catalog
}

/** 库内相对类目解析后的 Host 私有路径上下文。 */
export type DestinationResolution = {
  relative: string
  absolute: string
  segments: string[]
  deep: boolean
}

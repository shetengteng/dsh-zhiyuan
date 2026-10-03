import type { Catalog } from '../entity/catalog.ts'

/** catalog 单写者事务内使用的 Host 私有上下文。 */
export type CatalogTransactionContext = {
  dataRoot: string
  catalog: Catalog
}

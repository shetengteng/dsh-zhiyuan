import type { CatalogTransactionContext } from '../../model/context/kb-context.ts'
import type { Catalog } from '../../model/entity/catalog.ts'

export type CatalogTransactionOutcome<T> = {
  result: T
  catalog?: Catalog
}

export type CatalogTransactionWork<T> = (
  context: CatalogTransactionContext,
) => CatalogTransactionOutcome<T> | Promise<CatalogTransactionOutcome<T>>

/** catalog 聚合的持久化端口；事务负责进程内的读改写串行化。 */
export type CatalogRepository = {
  read(dataRoot: string): Promise<Catalog>
  save(dataRoot: string, catalog: Catalog): Promise<void>
  withTransaction<T>(dataRoot: string, work: CatalogTransactionWork<T>): Promise<T>
}

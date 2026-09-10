import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { Catalog } from '../../model/entity/catalog.ts'
import { catalogPath } from '../../platform/paths.ts'
import { catalogVersionWarning, emptyCatalog } from './catalog-codec.ts'
import { migrateCatalog, migrateLegacyDirectories } from './catalog-migration.ts'
import type { CatalogRepository, CatalogTransactionWork } from './catalog-repository.ts'

export type FileCatalogRepositoryOptions = {
  onWarning?: (message: string) => void
}

function isMissingCatalogFile(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  return (error as { code?: unknown }).code === 'ENOENT'
}

/** 维持跨 Repository 实例的进程内 catalog 读改写单写者。 */
let catalogTransactionChain = Promise.resolve()

async function withCatalogTransactionLock<T>(work: () => Promise<T>): Promise<T> {
  const run = catalogTransactionChain.then(work, work)
  catalogTransactionChain = run.then(() => undefined, () => undefined)
  return run
}

/** 以 JSON 文件持久化 catalog，并在单个 Host 进程内串行化迁移与事务写入。 */
export class FileCatalogRepository implements CatalogRepository {
  private readonly options: FileCatalogRepositoryOptions

  constructor(options: FileCatalogRepositoryOptions = {}) {
    this.options = options
  }

  async read(dataRoot: string): Promise<Catalog> {
    return withCatalogTransactionLock(() => this.readUnlocked(dataRoot))
  }

  async save(dataRoot: string, catalog: Catalog): Promise<void> {
    return withCatalogTransactionLock(async () => {
      await migrateLegacyDirectories(dataRoot)
      await this.saveUnlocked(dataRoot, catalog)
    })
  }

  async withTransaction<T>(dataRoot: string, work: CatalogTransactionWork<T>): Promise<T> {
    return withCatalogTransactionLock(async () => {
      const catalog = await this.readUnlocked(dataRoot)
      const outcome = await work({ dataRoot, catalog })
      if (outcome.catalog) await this.saveUnlocked(dataRoot, outcome.catalog)
      return outcome.result
    })
  }

  private async readUnlocked(dataRoot: string): Promise<Catalog> {
    await migrateLegacyDirectories(dataRoot)
    try {
      const text = await readFile(catalogPath(dataRoot), 'utf8')
      const raw = JSON.parse(text) as unknown
      const warning = catalogVersionWarning(raw)
      if (warning) this.options.onWarning?.(warning)
      const migration = migrateCatalog(raw)
      if (migration.migrated) await this.saveUnlocked(dataRoot, migration.catalog)
      return migration.catalog
    } catch (error) {
      if (isMissingCatalogFile(error)) return emptyCatalog()
      throw error
    }
  }

  private async saveUnlocked(dataRoot: string, catalog: Catalog): Promise<void> {
    const filePath = catalogPath(dataRoot)
    await mkdir(dirname(filePath), { recursive: true })
    const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
    try {
      await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, { flag: 'wx' })
      await rename(temporaryPath, filePath)
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined)
      throw error
    }
  }
}

import { KbError } from '../../model/error/kb-error.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'

export async function getLastDestinationCategory(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
): Promise<string | undefined> {
  const catalog = await catalogRepository.read(dataRoot)
  return catalog.kbs.find((card) => card.id === kbId)?.lastDestCategory
}

export async function rememberLastDestinationCategory(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
  destinationCategory: string,
): Promise<void> {
  await catalogRepository.withTransaction(dataRoot, ({ catalog }) => {
    const currentCard = catalog.kbs.find((card) => card.id === kbId)
    if (!currentCard || currentCard.lastDestCategory === destinationCategory) return { result: undefined }
    currentCard.lastDestCategory = destinationCategory
    return { result: undefined, catalog }
  })
}

export async function resolveImportDestination(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
  destinationCategoryFlag: string | undefined,
  importToKbRoot: boolean,
): Promise<string> {
  if (destinationCategoryFlag !== undefined) return destinationCategoryFlag
  if (importToKbRoot) return ''
  const lastDestinationCategory = await getLastDestinationCategory(catalogRepository, dataRoot, kbId)
  if (lastDestinationCategory === undefined) {
    throw new KbError('missing_field', '请指定 --to <类目>，或 --root 导入到库根')
  }
  return lastDestinationCategory
}

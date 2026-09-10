import type { EntryPreviewOptions, EntryWriteChange, TableEditorPage } from '../../content/host-api.ts'
import type { KbCard } from '../../model/entity/catalog.ts'
import type { CreateKbRequest, UpdateKbRequest } from '../../model/request/kb-request.ts'
import type { ImportDroppedBytesRequest, ImportFromPathRequest, ImportRequest } from '../../model/request/import-request.ts'
import type { UpdatePreferencesRequest } from '../../model/request/preferences-request.ts'
import type { SearchRequest } from '../../model/request/search-request.ts'
import type { KbSummaryResponse, KbTreeNodeResponse } from '../../model/response/kb-response.ts'
import type { ReadEntryResponse, TableEditorPage } from '../../model/response/entry-response.ts'
import type { ImportResponse } from '../../model/response/import-response.ts'
import type { SearchResult } from '../../model/response/search-response.ts'
import type { CatalogPrefs } from '../../model/value/catalog-prefs.ts'
import type { JobRunner } from '../../platform/jobs.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { listKbs, listTree } from './kb-tree.ts'
import { createKb, deleteKb, markKbUsed, requireKb, updateKb } from './kb-lifecycle.ts'
import { deleteEntry, readEntry, readEntryPage, writeEntryContent } from './entry.ts'
import { importDroppedBytes } from './import-drop.ts'
import { getLastDestinationCategory, resolveImportDestination } from './import-destination.ts'
import { enqueueKnowledgeImport } from './import-service.ts'
import { importFiles } from './import.ts'
import { getPreferences, updatePreferences } from './preferences.ts'
import { searchKb } from '../search/knowledge-search.ts'
import type { SearchKbAccess } from '../search/kb-access.ts'

export type KnowledgeServices = {
  createKb(dataRoot: string, input: CreateKbRequest): Promise<KbCard>
  updateKb(dataRoot: string, kbId: string, patch: UpdateKbRequest): Promise<KbCard>
  deleteKb(dataRoot: string, kbId: string, confirm: boolean): Promise<void>
  markKbUsed(dataRoot: string, kbId: string): Promise<void>
  requireKb(dataRoot: string, kbId: string): Promise<void>
  listKbs(dataRoot: string): Promise<KbSummaryResponse[]>
  listTree(dataRoot: string, kbId: string): Promise<KbTreeNodeResponse[]>
  readEntry(dataRoot: string, kbId: string, relativePath: string, options?: EntryPreviewOptions): Promise<ReadEntryResponse>
  writeEntryContent(dataRoot: string, kbId: string, relativePath: string, change: EntryWriteChange): Promise<void>
  readEntryPage(dataRoot: string, kbId: string, relativePath: string, startRow: number, pageSize: number): Promise<TableEditorPage>
  deleteEntry(dataRoot: string, kbId: string, relativePath: string, confirm: boolean): Promise<void>
  importFiles(dataRoot: string, input: ImportFromPathRequest): Promise<ImportResponse>
  importDroppedBytes(dataRoot: string, input: ImportDroppedBytesRequest): Promise<ImportResponse>
  enqueueKnowledgeImport(dataRoot: string, jobs: JobRunner, requestFactory: () => ImportRequest): Promise<ImportResponse>
  getLastDestinationCategory(dataRoot: string, kbId: string): Promise<string | undefined>
  resolveImportTo(dataRoot: string, kbId: string, destinationCategoryFlag: string | undefined, importToKbRoot: boolean): Promise<string>
  getPreferences(dataRoot: string): Promise<CatalogPrefs>
  updatePreferences(dataRoot: string, patch: UpdatePreferencesRequest): Promise<CatalogPrefs>
  searchKb(dataRoot: string, input: SearchRequest): Promise<SearchResult>
}

function createSearchKbAccess(catalogRepository: CatalogRepository, dataRoot: string): SearchKbAccess {
  return {
    ensureKb: (kbId) => requireKb(catalogRepository, dataRoot, kbId),
    markKbUsed: (kbId) => markKbUsed(catalogRepository, dataRoot, kbId),
  }
}

/** 组合知识库用例并将共享 catalog 端口注入各服务。 */
export function createKnowledgeServices(catalogRepository: CatalogRepository): KnowledgeServices {
  return {
    createKb: (dataRoot, input) => createKb(catalogRepository, dataRoot, input),
    updateKb: (dataRoot, kbId, patch) => updateKb(catalogRepository, dataRoot, kbId, patch),
    deleteKb: (dataRoot, kbId, confirm) => deleteKb(catalogRepository, dataRoot, kbId, confirm),
    markKbUsed: (dataRoot, kbId) => markKbUsed(catalogRepository, dataRoot, kbId),
    requireKb: (dataRoot, kbId) => requireKb(catalogRepository, dataRoot, kbId),
    listKbs: (dataRoot) => listKbs(catalogRepository, dataRoot),
    listTree: (dataRoot, kbId) => listTree(catalogRepository, dataRoot, kbId),
    readEntry: (dataRoot, kbId, relativePath, options) => readEntry(catalogRepository, dataRoot, kbId, relativePath, options),
    writeEntryContent: (dataRoot, kbId, relativePath, change) => writeEntryContent(catalogRepository, dataRoot, kbId, relativePath, change),
    readEntryPage: (dataRoot, kbId, relativePath, startRow, pageSize) => readEntryPage(catalogRepository, dataRoot, kbId, relativePath, startRow, pageSize),
    deleteEntry: (dataRoot, kbId, relativePath, confirm) => deleteEntry(catalogRepository, dataRoot, kbId, relativePath, confirm),
    importFiles: (dataRoot, input) => importFiles(catalogRepository, dataRoot, input),
    importDroppedBytes: (dataRoot, input) => importDroppedBytes(catalogRepository, dataRoot, input),
    enqueueKnowledgeImport: (dataRoot, jobs, requestFactory) => enqueueKnowledgeImport(catalogRepository, dataRoot, jobs, requestFactory),
    getLastDestinationCategory: (dataRoot, kbId) => getLastDestinationCategory(catalogRepository, dataRoot, kbId),
    resolveImportTo: (dataRoot, kbId, destinationCategoryFlag, importToKbRoot) => (
      resolveImportDestination(catalogRepository, dataRoot, kbId, destinationCategoryFlag, importToKbRoot)
    ),
    getPreferences: (dataRoot) => getPreferences(catalogRepository, dataRoot),
    updatePreferences: (dataRoot, patch) => updatePreferences(catalogRepository, dataRoot, patch),
    searchKb: (dataRoot, input) => searchKb(dataRoot, input, createSearchKbAccess(catalogRepository, dataRoot)),
  }
}

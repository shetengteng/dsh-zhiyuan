import type { EntryPreviewOptions, EntryWriteChange } from '../request/entry-request.ts'
import type { ImportFromPathRequest } from '../request/import-request.ts'
import type { ContinueSearchRequest, InitialSearchRequest } from '../request/search-request.ts'
import type { KbCard } from '../entity/catalog.ts'
import type { KbSummaryResponse, KbTreeNodeResponse } from '../response/kb-response.ts'
import type { ReadEntryResponse, TableEditorPage } from '../response/entry-response.ts'
import type { ImportResponse } from '../response/import-response.ts'
import type { OperationAckResponse, PickSourceResponse } from '../response/operation-response.ts'
import type { SearchResponse } from '../response/search-response.ts'
import type { CatalogPrefs } from '../value/catalog-prefs.ts'
import type { CreateKbRequest, UpdateKbRequest } from '../request/kb-request.ts'

export type KnowledgeListOperation = { op: 'list' }

export type KnowledgeCreateOperation = { op: 'create' } & CreateKbRequest

export type KnowledgeUpdateOperation = {
  op: 'update'
  id: string
} & UpdateKbRequest

export type KnowledgeDeleteKbOperation = {
  op: 'deleteKb'
  id: string
  confirm?: boolean
}

export type KnowledgeTreeOperation = {
  op: 'tree'
  id: string
}

export type KnowledgeReadOperation = {
  op: 'read'
  id: string
  path: string
} & EntryPreviewOptions

export type KnowledgeReadPageOperation = {
  op: 'readPage'
  id: string
  path: string
  startRow?: number
  pageSize?: number
}

export type KnowledgeWriteOperation = {
  op: 'write'
  id: string
  path: string
  change: EntryWriteChange
}

export type KnowledgeDeleteEntryOperation = {
  op: 'deleteEntry'
  id: string
  path: string
  confirm?: boolean
}

export type KnowledgePickOperation = {
  op: 'pick'
  kind: 'file' | 'dir'
}

export type KnowledgeImportPathOperation = {
  op: 'import'
} & Pick<
  ImportFromPathRequest,
  'kbId' | 'sourcePath' | 'destCategory' | 'preserveTree' | 'createMissing'
>

export type KnowledgeImportDroppedBytesOperation = {
  op: 'import'
  kbId: string
  destCategory: string
  sourceName: string
  sourceBase64: string
  preserveTree?: boolean
  createMissing?: boolean
}

export type KnowledgeInitialSearchOperation = {
  op: 'search'
} & InitialSearchRequest

export type KnowledgeContinueSearchOperation = {
  op: 'search'
} & ContinueSearchRequest

export type KnowledgePrefsOperation = { op: 'prefs' }

export type KnowledgeSetPrefsOperation = {
  op: 'setPrefs'
} & Partial<CatalogPrefs>

/** /zhiyuan operation endpoint 接受的完整判别请求联合。 */
export type KnowledgeOperationRequest =
  | KnowledgeListOperation
  | KnowledgeCreateOperation
  | KnowledgeUpdateOperation
  | KnowledgeDeleteKbOperation
  | KnowledgeTreeOperation
  | KnowledgeReadOperation
  | KnowledgeReadPageOperation
  | KnowledgeWriteOperation
  | KnowledgeDeleteEntryOperation
  | KnowledgePickOperation
  | KnowledgeImportPathOperation
  | KnowledgeImportDroppedBytesOperation
  | KnowledgeInitialSearchOperation
  | KnowledgeContinueSearchOperation
  | KnowledgePrefsOperation
  | KnowledgeSetPrefsOperation

export type KnowledgeOperationName = KnowledgeOperationRequest['op']

/** 每个 operation 的既有返回 JSON 形状；不改变 list 的裸数组或内层 ack。 */
export type KnowledgeOperationResponseByOp = {
  list: KbSummaryResponse[]
  create: KbCard
  update: KbCard
  deleteKb: OperationAckResponse
  tree: KbTreeNodeResponse[]
  read: ReadEntryResponse
  readPage: TableEditorPage
  write: OperationAckResponse
  deleteEntry: OperationAckResponse
  pick: PickSourceResponse
  import: ImportResponse
  search: SearchResponse
  prefs: CatalogPrefs
  setPrefs: CatalogPrefs
}

export type KnowledgeOperationResponse<
  TOperation extends KnowledgeOperationName = KnowledgeOperationName,
> = KnowledgeOperationResponseByOp[TOperation]

export type KnowledgeOperationResponseFor<
  TRequest extends KnowledgeOperationRequest,
> = KnowledgeOperationResponse<TRequest['op']>

export type KnowledgeOperationRequestFor<
  TOperation extends KnowledgeOperationName,
> = Extract<KnowledgeOperationRequest, { op: TOperation }>

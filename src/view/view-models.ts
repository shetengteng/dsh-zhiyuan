export type { KbSummaryResponse, KbTreeNodeResponse } from '../model/response/kb-response.ts'
export type { CatalogPrefs } from '../model/value/catalog-prefs.ts'
export type { EntryContentKind, EntryFormat, EntryPreviewView } from '../model/content-contract.ts'
export type { EntryWriteChange, TablePatch } from '../model/request/entry-request.ts'
export type { ImportResponse } from '../model/response/import-response.ts'
export type { JobStatusResponse } from '../model/response/job-response.ts'
export type {
  ReadEntryResponse,
  TableEditorPage,
  TableEntryPreview,
  TableWindowData,
  TextEntryPreview,
} from '../model/response/entry-response.ts'
export type {
  SearchFileDetailPage,
  SearchFileDetailResult,
  SearchFileSummary,
  SearchHit,
  SearchOverviewPage,
  SearchOverviewResult,
  SearchPageInfo,
  SearchQuery,
  SearchResult,
  SearchScanInfo,
  SearchScanStopReason,
} from '../model/response/search-response.ts'

export type DialogKind = 'create' | 'edit' | 'import' | 'search' | 'preview' | 'confirm' | null

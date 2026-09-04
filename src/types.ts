import type { EntryFormat, EntryPreviewView, PreviewStatus, PreviewTruncation, TableWindowData } from './content/api.ts'

export type CatalogPrefs = {
  defaultBaseId: string
  maxFileBytes: number
  maxBaseBytes: number
}

export type BaseCard = {
  id: string
  title: string
  description: string
  aliases: string[]
  createdAt: number
  lastUsedAt: number
  lastDestCategory?: string
}

export type Catalog = {
  version: 1
  lastUsedBaseId: string
  prefs: CatalogPrefs
  bases: BaseCard[]
}

export type BaseSummary = BaseCard & {
  categories: string[]
  approxDocs: number
  lastUsed: boolean
}

export type TreeNode = {
  name: string
  kind: 'dir' | 'file'
  path: string
  size?: number
  mtime?: number
  children?: TreeNode[]
}

type EntryPreviewMeta = {
  path: string
  format: EntryFormat
  view: EntryPreviewView
  windowStartLine: number
  windowEndLine: number
  focusLine?: number
  focusColumnByte?: number
  truncation: PreviewTruncation
  totalChars: number
  previewStatus: PreviewStatus
}

/** 条目读取结果：正文按 kind（交互形态）判别，上层不感知文件格式。 */
export type ReadEntryResult = EntryPreviewMeta & (
  | { kind: 'text'; text: string }
  | { kind: 'table'; text: string; table: TableWindowData }
)

export type TextEntryPreview = Extract<ReadEntryResult, { kind: 'text' }>
export type TableEntryPreview = Extract<ReadEntryResult, { kind: 'table' }>

export type SearchHit = {
  n: number
  path: string
  startLine: number
  endLine: number
  matchLine: number
  excerpt: string
  /** 命中行展示文本；缺省时按物理行窗口从 excerpt 切片 */
  matchedExcerpt?: string
  matchColumnByte?: number
  sourceFingerprint?: string
}

export type SearchResult = {
  hits: SearchHit[]
  warnings: string[]
  /** true 表示本次搜索已经扫描完可搜索范围；false 时不能宣称全量。 */
  scanComplete: boolean
  /** 当前页之后是否已经发现下一页命中。 */
  hasMore: boolean
  nextCursor?: string
}

export type SearchInput = {
  baseId: string
  rootDir: string
  terms: string[]
  topK: number
  offset: number
}

export type SearchPage = {
  hits: SearchHit[]
  scanComplete: boolean
  hasMore: boolean
}

export interface SearchEngine {
  search(input: SearchInput): Promise<SearchPage>
}

export type IngestInput = {
  baseId: string
  sourcePath: string
  destCategory: string
  preserveTree?: boolean
  createMissing?: boolean
  onConflict?: 'skip'
}

export type IngestFileResult = {
  relPath: string
  sourceRelPath: string
  destinationPath?: string
  status: 'copied' | 'skipped' | 'renamed' | 'failed'
  code?: 'ext_denied' | 'file_too_large' | 'quota' | 'path_escape' | 'csv_encoding_invalid' | 'csv_control_character' | 'csv_line_too_long' | 'encoding_unsupported' | 'io_failed'
  reason?: string
  writtenBytes?: number
  warnings?: string[]
}

export type IngestResult = {
  baseId: string
  copied: string[]
  renamed: string[]
  skipped: number
  failed: number
  createdDirs: string[]
  files: IngestFileResult[]
  warnings: string[]
}

export type JobStatus = {
  running: boolean
  op?: string
  failed: Array<{ op: string; message: string; at: number }>
}

export type CreateBaseInput = {
  title: string
  description: string
  aliases?: string[]
}

export type UpdateBasePatch = {
  title?: string
  description?: string
  aliases?: string[]
}

export type KbErrorCode =
  | 'missing_field'
  | 'invalid_field'
  | 'unknown_op'
  | 'base_exists'
  | 'title_exists'
  | 'base_missing'
  | 'path_escape'
  | 'confirm_required'
  | 'quota'
  | 'ext_denied'
  | 'file_too_large'
  | 'read_only_format'
  | 'invalid_preview'
  | 'preview_too_large'
  | 'csv_encoding_invalid'
  | 'csv_control_character'
  | 'csv_line_too_long'
  | 'csv_parse_invalid'
  | 'csv_patch_invalid'
  | 'csv_revision_conflict'
  | 'encoding_unsupported'
  | 'not_found'

export class KbError extends Error {
  readonly code: KbErrorCode
  constructor(code: KbErrorCode, message: string) {
    super(message)
    this.name = 'KbError'
    this.code = code
  }
}
export type { EntryContentKind, EntryFormat, EntryPreviewView, EntryWriteChange, PreviewStatus, PreviewTruncation, TableCellChange, TableEditorPage, TableHeaderChange, TablePatch, TableWindowData } from './content/api.ts'

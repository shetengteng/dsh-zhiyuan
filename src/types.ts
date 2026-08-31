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

export type SearchHit = {
  n: number
  path: string
  startLine: number
  endLine: number
  excerpt: string
}

export type SearchResult = {
  hits: SearchHit[]
  warnings: string[]
}

export type SearchInput = {
  baseId: string
  rootDir: string
  terms: string[]
  topK: number
}

export interface SearchEngine {
  search(input: SearchInput): Promise<SearchHit[]>
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
  status: 'copied' | 'skipped' | 'renamed' | 'failed'
  reason?: string
}

export type IngestResult = {
  baseId: string
  copied: string[]
  renamed: string[]
  skipped: number
  failed: number
  createdDirs: string[]
  files: IngestFileResult[]
}

export type JobStatus = {
  running: boolean
  op?: string
  failed: Array<{ op: string; message: string; at: number }>
}

export type CreateBaseInput = {
  id: string
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
  | 'invalid_id'
  | 'missing_field'
  | 'base_exists'
  | 'base_missing'
  | 'path_escape'
  | 'confirm_required'
  | 'quota'
  | 'ext_denied'
  | 'not_found'

export class KbError extends Error {
  readonly code: KbErrorCode
  constructor(code: KbErrorCode, message: string) {
    super(message)
    this.name = 'KbError'
    this.code = code
  }
}

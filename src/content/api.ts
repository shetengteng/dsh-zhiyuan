/** Host 与 Client 共享的稳定、可序列化契约。 */
export const SourceFormat = {
  Markdown: 'markdown',
  PlainText: 'plain-text',
  Csv: 'csv',
  Xlsx: 'xlsx',
} as const

export type SourceFormat = typeof SourceFormat[keyof typeof SourceFormat]

export const EntryFormat = {
  Markdown: 'markdown',
  Csv: 'csv',
} as const

export type EntryFormat = typeof EntryFormat[keyof typeof EntryFormat]

export const EntryPreviewView = {
  Tree: 'tree',
  SearchHit: 'search-hit',
} as const

export type EntryPreviewView = typeof EntryPreviewView[keyof typeof EntryPreviewView]

/** Host 读取条目时返回的源内容范围。 */
export const EntryReadMode = {
  Preview: 'preview',
  Edit: 'edit',
} as const

export type EntryReadMode = typeof EntryReadMode[keyof typeof EntryReadMode]

export type PreviewStatus = 'ready' | 'stale' | 'fallback'

export type PreviewTruncation = 'none' | 'before' | 'after' | 'both'

export type EntryCapabilities = {
  canEdit: boolean
}

/** 按逻辑记录对齐的 CSV 窗口。行号不含表头，从 1 起。 */
export type CsvPreviewData = {
  headers: string[]
  rows: string[][]
  totalRows: number
  windowStartRow: number
  windowEndRow: number
  complete: boolean
  focusedRow?: number
  revision?: string
}

/** 轻量 CSV 表格编辑器使用的一页记录。 */
export type CsvEditorPage = CsvPreviewData & {
  revision: string
}

export type CsvHeaderChange = {
  column: number
  value: string
}

export type CsvCellChange = {
  row: number
  column: number
  value: string
}

/** 针对某一内容寻址版本的稀疏 CSV 修改。 */
export type CsvEntryPatch = {
  revision: string
  headerChanges: CsvHeaderChange[]
  cellChanges: CsvCellChange[]
}

export type EntryPreviewOptions = {
  view?: EntryPreviewView
  readMode?: EntryReadMode
  matchLine?: number
  matchColumnByte?: number
  sourceFingerprint?: string
}

export function isEntryFormat(value: unknown): value is EntryFormat {
  return value === EntryFormat.Markdown || value === EntryFormat.Csv
}

export function isEntryPreviewView(value: unknown): value is EntryPreviewView {
  return value === EntryPreviewView.Tree || value === EntryPreviewView.SearchHit
}

export function isEntryReadMode(value: unknown): value is EntryReadMode {
  return value === EntryReadMode.Preview || value === EntryReadMode.Edit
}

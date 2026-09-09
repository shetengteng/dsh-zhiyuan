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

/** 预览与编辑的交互形态。判别轴是形态而不是文件格式：格式增长不触碰本枚举。 */
export const EntryContentKind = {
  Text: 'text',
  Table: 'table',
} as const

export type EntryContentKind = typeof EntryContentKind[keyof typeof EntryContentKind]

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

/** 按逻辑记录对齐的表格窗口。行号不含表头，从 1 起。 */
export type TableWindowData = {
  headers: string[]
  rows: string[][]
  totalRows: number
  windowStartRow: number
  windowEndRow: number
  complete: boolean
  focusedRow?: number
  revision?: string
}

/** 轻量表格编辑器使用的一页记录。 */
export type TableEditorPage = TableWindowData & {
  revision: string
}

export type TableHeaderChange = {
  column: number
  value: string
}

export type TableCellChange = {
  row: number
  column: number
  value: string
}

/** 针对某一内容寻址版本的稀疏表格修改。 */
export type TablePatch = {
  revision: string
  headerChanges: TableHeaderChange[]
  cellChanges: TableCellChange[]
}

/** 条目写入的判别联合：整文件替换或稀疏表格修改。 */
export type EntryWriteChange =
  | { kind: 'text'; text: string }
  | { kind: 'table-patch'; patch: TablePatch }

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

export function isEntryContentKind(value: unknown): value is EntryContentKind {
  return value === EntryContentKind.Text || value === EntryContentKind.Table
}

export function isEntryPreviewView(value: unknown): value is EntryPreviewView {
  return value === EntryPreviewView.Tree || value === EntryPreviewView.SearchHit
}

export function isEntryReadMode(value: unknown): value is EntryReadMode {
  return value === EntryReadMode.Preview || value === EntryReadMode.Edit
}

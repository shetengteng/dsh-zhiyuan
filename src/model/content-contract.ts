/** Host 与 Client 共享的稳定、可序列化格式值。 */
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

/** Host 读取条目时使用的内容范围。 */
export const EntryReadMode = {
  Preview: 'preview',
  Edit: 'edit',
} as const

export type EntryReadMode = typeof EntryReadMode[keyof typeof EntryReadMode]

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

/** Stable, serializable contract shared by Host and Client. */
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

/** The amount of source content the Host returns for an entry read. */
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

/** A record-aligned CSV window. Row indexes exclude the header and start at 1. */
export type CsvPreviewData = {
  headers: string[]
  rows: string[][]
  totalRows: number
  windowStartRow: number
  windowEndRow: number
  complete: boolean
  focusedRow?: number
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

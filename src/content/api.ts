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

export type PreviewStatus = 'ready' | 'stale' | 'fallback'

export type PreviewTruncation = 'none' | 'before' | 'after' | 'both'

export type EntryCapabilities = {
  canEdit: boolean
}

export type EntryPreviewOptions = {
  view?: EntryPreviewView
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

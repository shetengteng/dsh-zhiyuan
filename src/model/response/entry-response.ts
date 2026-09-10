import type { EntryFormat, EntryPreviewView } from '../content-contract.ts'

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

export type EntryPreviewMetaResponse = {
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
export type ReadEntryResponse = EntryPreviewMetaResponse & (
  | { kind: 'text'; text: string }
  | { kind: 'table'; text: string; table: TableWindowData }
)

export type TextEntryPreview = Extract<ReadEntryResponse, { kind: 'text' }>
export type TableEntryPreview = Extract<ReadEntryResponse, { kind: 'table' }>

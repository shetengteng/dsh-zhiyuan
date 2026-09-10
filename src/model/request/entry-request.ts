import type { EntryPreviewView, EntryReadMode } from '../content-contract.ts'

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

/** 条目预览和编辑读取的应用请求参数。 */
export type EntryPreviewOptions = {
  view?: EntryPreviewView
  readMode?: EntryReadMode
  matchLine?: number
  matchColumnByte?: number
  sourceFingerprint?: string
}

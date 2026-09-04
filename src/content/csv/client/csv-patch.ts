import type { TableCellChange, TablePatch } from '../../api.ts'

export type CsvActiveEdit = {
  row: number
  column: number
  originalValue: string
  value: string
  isHeader: boolean
}

export type CsvChanges = {
  headers: Map<number, string>
  cells: Map<string, TableCellChange>
}

export function emptyCsvChanges(): CsvChanges {
  return { headers: new Map(), cells: new Map() }
}

export function cellKey(row: number, column: number): string {
  return `${row}:${column}`
}

export function storeEdit(changes: CsvChanges, edit: CsvActiveEdit): CsvChanges {
  const headers = new Map(changes.headers)
  const cells = new Map(changes.cells)
  if (edit.isHeader) {
    if (edit.value === edit.originalValue) headers.delete(edit.column)
    else headers.set(edit.column, edit.value)
  } else {
    const key = cellKey(edit.row, edit.column)
    if (edit.value === edit.originalValue) cells.delete(key)
    else cells.set(key, { row: edit.row, column: edit.column, value: edit.value })
  }
  return { headers, cells }
}

export function withActiveEdit(changes: CsvChanges, activeEdit: CsvActiveEdit | null): CsvChanges {
  return activeEdit ? storeEdit(changes, activeEdit) : changes
}

export function buildPatch(revision: string, changes: CsvChanges): TablePatch | undefined {
  if (!changes.headers.size && !changes.cells.size) return undefined
  return {
    revision,
    headerChanges: [...changes.headers].sort(([left], [right]) => left - right).map(([column, value]) => ({ column, value })),
    cellChanges: [...changes.cells.values()].sort((left, right) => left.row - right.row || left.column - right.column),
  }
}

import { useEffect, useState } from 'react'
import DataGrid from 'react-data-grid'
import type { Column, RowsChangeData } from 'react-data-grid'
import type { TableEditorPage } from '../../../model/response/entry-response.ts'
import { CsvHeaderCell, renderCsvCellEditor, type CsvHeaderEdit } from './csv-grid-cells.tsx'
import { cellField, toGridRows, type CsvGridRow } from './csv-grid-rows.ts'

export type CsvGridProps = {
  page: TableEditorPage
  startRow: number
  editable: boolean
  focusedRow?: number
  headerEdit: CsvHeaderEdit | null
  onHeaderEditStart: (edit: CsvHeaderEdit) => void
  onHeaderEditChange: (value: string) => void
  onHeaderEditCommit: () => void
  onHeaderEditCancel: () => void
  onRowsChange: (rows: CsvGridRow[], data: RowsChangeData<CsvGridRow>) => void
}

/** 基于 react-data-grid 的表格视图：冻结行号列 + 可编辑数据列，随容器撑满。 */
export function CsvGrid(props: CsvGridProps) {
  const [gridRows, setGridRows] = useState<CsvGridRow[]>(() => toGridRows(props.startRow, props.page.rows))

  useEffect(() => {
    setGridRows(toGridRows(props.startRow, props.page.rows))
  }, [props.page, props.startRow])

  const columns: Column<CsvGridRow>[] = [
    {
      key: 'rowNumber',
      name: '行',
      frozen: true,
      resizable: false,
      width: 48,
      minWidth: 48,
      maxWidth: 48,
      cellClass: 'zy-rdg-rownum',
      renderCell: (cell) => cell.row.rowNumber,
    },
    ...props.page.headers.map((header, index) => ({
      key: cellField(index),
      name: header,
      width: 132,
      minWidth: 100,
      resizable: true,
      editable: props.editable,
      renderEditCell: props.editable ? renderCsvCellEditor : undefined,
      renderHeaderCell: () => (
        <CsvHeaderCell
          label={props.headerEdit?.column === index ? props.headerEdit.value : header}
          editable={props.editable}
          editing={props.headerEdit?.column === index}
          onStartEdit={() => props.onHeaderEditStart({ column: index, value: header })}
          onEditChange={props.onHeaderEditChange}
          onCommit={props.onHeaderEditCommit}
          onCancel={props.onHeaderEditCancel}
        />
      ),
    })),
  ]

  return (
    <div className="zy-csv-grid" aria-label={props.editable ? 'CSV 表格编辑器' : 'CSV 表格预览'}>
      <DataGrid
        className="zy-rdg"
        columns={columns}
        rows={gridRows}
        rowKeyGetter={(row) => row.rowNumber}
        rowClass={(row) => (row.rowNumber === props.focusedRow ? 'zy-csv-row-focus' : undefined)}
        onRowsChange={handleRowsChange}
      />
    </div>
  )

  function handleRowsChange(rows: CsvGridRow[], data: RowsChangeData<CsvGridRow>) {
    setGridRows(rows)
    props.onRowsChange(rows, data)
  }
}

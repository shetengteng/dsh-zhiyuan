import type { ReactElement } from 'react'
import type { RenderEditCellProps } from 'react-data-grid'
import type { CsvGridRow } from './csv-grid-rows.ts'

/** 表头编辑的受控值；column 为业务列索引，value 为编辑中的文本。 */
export type CsvHeaderEdit = {
  column: number
  value: string
}

/** 单元格编辑器：多行 textarea，Enter 提交、Shift+Enter 换行、Esc 取消由网格处理。 */
export function renderCsvCellEditor({ row, column, onRowChange }: RenderEditCellProps<CsvGridRow>): ReactElement {
  return (
    <textarea
      className="zy-rdg-cell-editor"
      aria-label={`编辑 ${column.name}`}
      value={String(row[column.key] ?? '')}
      onChange={(event) => onRowChange({ ...row, [column.key]: event.target.value })}
    />
  )
}

/** 可编辑表头：非编辑态显示按钮，点击进入 input，提交/取消由父级统一处理。 */
export function CsvHeaderCell(props: {
  label: string
  editable: boolean
  editing: boolean
  onStartEdit: () => void
  onEditChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  if (!props.editable) return <>{props.label}</>
  if (props.editing) {
    return (
      <input
        className="zy-rdg-header-input"
        aria-label={`编辑列名 ${props.label}`}
        autoFocus
        value={props.label}
        onChange={(event) => props.onEditChange(event.target.value)}
        onBlur={props.onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') props.onCommit()
          if (event.key === 'Escape') props.onCancel()
        }}
      />
    )
  }
  return (
    <button
      className="zy-rdg-header-button"
      type="button"
      title={props.label}
      onClick={props.onStartEdit}
    >{props.label}</button>
  )
}

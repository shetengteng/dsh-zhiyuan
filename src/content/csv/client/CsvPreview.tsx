import { ClientSideRowModelModule, TextEditorModule, themeQuartz, type ColDef } from 'ag-grid-community'
import { AgGridProvider, AgGridReact } from 'ag-grid-react'
import Papa from 'papaparse'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ReadEntryResult } from '../../../client/models.ts'

type CsvGridRow = {
  id: string
  sourceRow: number
  cells: string[]
}

export type CsvEditorHandle = {
  getText: () => string
}

export type CsvPreviewProps = {
  preview: ReadEntryResult
  mode: 'read' | 'edit'
  showPreviewStatus?: boolean
}

const GRID_MODULES = [ClientSideRowModelModule, TextEditorModule]
const CSV_GRID_THEME = themeQuartz.withParams({
  backgroundColor: 'var(--dsw-alias-bg-layer-1)',
  foregroundColor: 'var(--dsw-alias-label-primary)',
  borderColor: 'var(--dsw-alias-border-l2)',
  headerBackgroundColor: 'var(--dsw-alias-bg-module-platform)',
  fontFamily: 'var(--ds-font-family)',
  headerHeight: 34,
  rowHeight: 34,
  cellHorizontalPadding: 12,
  wrapperBorderRadius: 10,
})

/** The shared CSV preview/editor. It only renders Host-parsed, record-aligned data. */
export const CsvPreview = forwardRef<CsvEditorHandle, CsvPreviewProps>(function CsvPreview(props, ref) {
  const [draft, setDraft] = useState(() => createDraft(props.preview))
  const [selectedRowId, setSelectedRowId] = useState('')
  const nextRowId = useRef(0)
  const csv = props.preview.csv
  const editable = props.mode === 'edit' && Boolean(csv?.complete)

  useEffect(() => {
    setDraft(createDraft(props.preview))
    setSelectedRowId('')
    nextRowId.current = 0
  }, [props.preview.path, props.preview.csv])

  useImperativeHandle(ref, () => ({
    getText: () => csv ? serializeCsv(draft.headers, draft.rows) : props.preview.text,
  }), [csv, draft.headers, draft.rows, props.preview.text])

  const columnDefs = useMemo<ColDef<CsvGridRow>[]>(() => draft.headers.map((header, index) => ({
    colId: `column-${index}`,
    headerName: header || `列 ${index + 1}`,
    minWidth: 132,
    flex: 1,
    resizable: true,
    sortable: !editable,
    editable,
    valueGetter: (params) => params.data?.cells[index] ?? '',
    valueSetter: (params) => {
      if (!params.data) return false
      const nextValue = typeof params.newValue === 'string' ? params.newValue : String(params.newValue ?? '')
      const nextCells = [...params.data.cells]
      nextCells[index] = nextValue
      params.data.cells = nextCells
      setDraft((current) => ({
        ...current,
        rows: current.rows.map((row) => row.id === params.data?.id ? { ...row, cells: nextCells } : row),
      }))
      return true
    },
  })), [draft.headers, editable])

  if (!csv) return <RawCsvFallback preview={props.preview} />

  const onAddRow = () => {
    nextRowId.current += 1
    setDraft((current) => ({
      ...current,
      rows: [...current.rows, { id: `added-${nextRowId.current}`, sourceRow: 0, cells: current.headers.map(() => '') }],
    }))
  }
  const onDeleteSelectedRow = () => {
    if (!selectedRowId) return
    setDraft((current) => ({ ...current, rows: current.rows.filter((row) => row.id !== selectedRowId) }))
    setSelectedRowId('')
  }
  const onAddColumn = () => {
    setDraft((current) => ({
      headers: [...current.headers, ''],
      rows: current.rows.map((row) => ({ ...row, cells: [...row.cells, ''] })),
    }))
  }
  const onUpdateHeader = (index: number, value: string) => {
    setDraft((current) => ({ ...current, headers: current.headers.map((header, cursor) => cursor === index ? value : header) }))
  }
  const onDeleteColumn = (index: number) => {
    if (draft.headers.length <= 1) return
    setDraft((current) => ({
      headers: current.headers.filter((_header, cursor) => cursor !== index),
      rows: current.rows.map((row) => ({ ...row, cells: row.cells.filter((_cell, cursor) => cursor !== index) })),
    }))
  }

  return (
    <div className="zy-csv-preview">
      <div className="zy-preview-status" role="status">{statusText(props.preview)}</div>
      {editable ? (
        <div className="zy-csv-editor-tools" aria-label="CSV 表格编辑工具">
          <button className="zy-btn" type="button" onClick={onAddRow}>新增行</button>
          <button className="zy-btn" type="button" disabled={!selectedRowId} onClick={onDeleteSelectedRow}>删除当前行</button>
          <button className="zy-btn" type="button" onClick={onAddColumn}>新增列</button>
        </div>
      ) : null}
      {editable ? (
        <div className="zy-csv-header-fields" aria-label="CSV 表头编辑">
          {draft.headers.map((header, index) => (
            <label className="zy-csv-header-field" key={`header-${index}`}>
              <span>第 {index + 1} 列</span>
              <input
                className="zy-box"
                aria-label={`第 ${index + 1} 列表头`}
                value={header}
                placeholder={`列 ${index + 1}`}
                onChange={(event) => onUpdateHeader(index, event.currentTarget.value)}
              />
              <button
                className="zy-csv-delete-column"
                type="button"
                aria-label={`删除第 ${index + 1} 列`}
                disabled={draft.headers.length <= 1}
                onClick={() => onDeleteColumn(index)}
              >×</button>
            </label>
          ))}
        </div>
      ) : null}
      <div className="zy-csv-grid" aria-label={editable ? 'CSV 编辑表格' : 'CSV 只读预览'}>
        <AgGridProvider modules={GRID_MODULES}>
          <AgGridReact<CsvGridRow>
            theme={CSV_GRID_THEME}
            rowData={draft.rows}
            columnDefs={columnDefs}
            getRowId={(params) => params.data.id}
            suppressMovableColumns
            singleClickEdit={editable}
            stopEditingWhenCellsLoseFocus
            onRowClicked={(event) => setSelectedRowId(event.data?.id ?? '')}
            getRowClass={(params) => (
              params.data?.sourceRow === csv.focusedRow ? 'zy-csv-grid-focus' : undefined
            )}
          />
        </AgGridProvider>
      </div>
    </div>
  )
})

function createDraft(preview: ReadEntryResult): { headers: string[]; rows: CsvGridRow[] } {
  const csv = preview.csv
  if (!csv) return { headers: [], rows: [] }
  return {
    headers: [...csv.headers],
    rows: csv.rows.map((cells, index) => ({
      id: `source-${csv.windowStartRow + index}`,
      sourceRow: csv.windowStartRow + index,
      cells: [...cells],
    })),
  }
}

function serializeCsv(headers: string[], rows: CsvGridRow[]): string {
  return Papa.unparse([headers, ...rows.map((row) => row.cells)], { newline: '\n' })
}

function RawCsvFallback(props: { preview: ReadEntryResult }) {
  return (
    <div className="zy-csv-preview">
      <div className="zy-preview-status" role="status">{statusText(props.preview)}</div>
      <pre className="zy-csv-body" aria-label="CSV 预览文本">{props.preview.text}</pre>
    </div>
  )
}

function statusText(preview: ReadEntryResult): string {
  const csv = preview.csv
  const location = preview.view === 'search-hit' ? '显示命中附近' : '显示文件开头'
  const rows = csv?.complete
    ? `；已加载全部 ${csv.totalRows} 行数据`
    : csv ? `；显示第 ${csv.windowStartRow}–${csv.windowEndRow} 行，共 ${csv.totalRows} 行` : ''
  const truncation = preview.truncation === 'both'
    ? '，前后均有省略'
    : preview.truncation === 'before'
      ? '，前面有省略'
      : preview.truncation === 'after'
        ? '，后面有省略'
        : ''
  if (preview.previewStatus === 'stale') return `${location}；文件已变化，未高亮旧命中${rows}${truncation}`
  if (preview.previewStatus === 'fallback') return `${location}；命中位置已失效${rows}${truncation}`
  return `${location}${rows}${truncation}`
}

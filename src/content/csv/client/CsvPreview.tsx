import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { TableVirtuoso } from 'react-virtuoso'
import type { CsvEditorPage, CsvEntryPatch } from '../../api.ts'
import type { ReadEntryResult } from '../../../client/models.ts'
import {
  buildPatch,
  cellKey,
  emptyCsvChanges,
  storeEdit,
  withActiveEdit,
  type CsvActiveEdit,
  type CsvChanges,
} from './csv-patch.ts'

export type CsvEditorHandle = {
  getText: () => string
  getCsvPatch?: () => CsvEntryPatch | undefined
}

export type CsvPreviewProps = {
  preview: ReadEntryResult
  mode: 'read' | 'edit'
  showPreviewStatus?: boolean
  onLoadPage?: (startRow: number) => Promise<CsvEditorPage>
}

/** 轻量 CSV 查看与单元格编辑用的虚拟原生表格。 */
export const CsvPreview = forwardRef<CsvEditorHandle, CsvPreviewProps>(function CsvPreview(props, ref) {
  const csv = props.preview.csv
  const [page, setPage] = useState<CsvEditorPage | undefined>(() => editorPage(csv))
  const [changes, setChanges] = useState<CsvChanges>(emptyCsvChanges)
  const [activeEdit, setActiveEdit] = useState<CsvActiveEdit | null>(null)
  const [pageBusy, setPageBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const requestId = useRef(0)
  const cancelledEdit = useRef<CsvActiveEdit | null>(null)
  const editable = props.mode === 'edit' && Boolean(page?.revision)

  useEffect(() => {
    requestId.current += 1
    setPage(editorPage(csv))
    setChanges(emptyCsvChanges())
    setActiveEdit(null)
    setPageBusy(false)
    setPageError('')
  }, [props.preview.path, csv?.revision])

  useEffect(() => () => { requestId.current += 1 }, [])

  useImperativeHandle(ref, () => ({
    getText: () => props.preview.text,
    getCsvPatch: () => page?.revision ? buildPatch(page.revision, withActiveEdit(changes, activeEdit)) : undefined,
  }), [activeEdit, changes, page?.revision, props.preview.text])

  if (!csv || !page) return <RawCsvFallback preview={props.preview} showPreviewStatus={props.showPreviewStatus} />

  const currentValue = (row: number, column: number, source: string, isHeader: boolean): string => {
    if (isHeader) return changes.headers.get(column) ?? source
    return changes.cells.get(cellKey(row, column))?.value ?? source
  }

  const persistEdit = (edit: CsvActiveEdit) => setChanges((current) => storeEdit(current, edit))
  const beginEdit = (edit: CsvActiveEdit) => {
    if (!editable) return
    if (activeEdit) persistEdit(activeEdit)
    setActiveEdit(edit)
  }
  const finishEdit = () => {
    if (cancelledEdit.current === activeEdit) {
      cancelledEdit.current = null
      return
    }
    if (activeEdit) persistEdit(activeEdit)
    setActiveEdit(null)
  }
  const cancelEdit = () => {
    cancelledEdit.current = activeEdit
    setActiveEdit(null)
  }

  const loadPage = async (startRow: number): Promise<void> => {
    if (!props.onLoadPage || pageBusy) return
    const nextRequest = requestId.current + 1
    requestId.current = nextRequest
    setPageBusy(true)
    setPageError('')
    try {
      const nextPage = await props.onLoadPage(startRow)
      if (requestId.current === nextRequest) {
        if (activeEdit) persistEdit(activeEdit)
        setActiveEdit(null)
        if (nextPage.revision !== page.revision) {
          setChanges(emptyCsvChanges())
          setPageError('文件已变化，未保存的表格修改已清除')
        }
        setPage(nextPage)
      }
    } catch (error) {
      if (requestId.current === nextRequest) setPageError(error instanceof Error ? error.message : '读取 CSV 分页失败')
    } finally {
      if (requestId.current === nextRequest) setPageBusy(false)
    }
  }

  const startRow = page.windowStartRow || 1
  const previousStartRow = Math.max(1, startRow - Math.max(1, page.rows.length))
  const nextStartRow = page.windowEndRow + 1
  return (
    <div className="zy-csv-preview">
      {props.showPreviewStatus ? <div className="zy-preview-status" role="status">{statusText(props.preview)}</div> : null}
      {editable ? (
        <div className="zy-csv-page-tools" aria-label="CSV 分页工具">
          <span className="zy-csv-page-status" aria-live="polite">第 {page.windowStartRow || 0}–{page.windowEndRow || 0} 行，共 {page.totalRows} 行</span>
          <button className="zy-btn" type="button" disabled={pageBusy || page.windowStartRow <= 1} onClick={() => void loadPage(previousStartRow)}>上一页</button>
          <button className="zy-btn" type="button" disabled={pageBusy || page.windowEndRow >= page.totalRows} onClick={() => void loadPage(nextStartRow)}>下一页</button>
        </div>
      ) : null}
      {pageError ? <div className="zy-csv-page-error" role="alert">{pageError}</div> : null}
      <div className="zy-csv-grid" aria-label={editable ? 'CSV 表格编辑器' : 'CSV 表格预览'}>
        <TableVirtuoso
          className="zy-csv-table"
          data={page.rows}
          computeItemKey={(index) => startRow + index}
          fixedHeaderContent={() => (
            <tr>
              <th className="zy-csv-row-number" scope="col">行</th>
              {page.headers.map((header, column) => {
                const value = currentValue(0, column, header, true)
                return <th key={`header-${column}`} scope="col">{renderCell(value, 0, column, true)}</th>
              })}
            </tr>
          )}
          itemContent={(index, row) => {
            const rowNumber = startRow + index
            return (
              <>
                <th className={rowNumber === csv.focusedRow ? 'zy-csv-row-number zy-csv-row-focus' : 'zy-csv-row-number'} scope="row">{rowNumber}</th>
                {page.headers.map((_header, column) => (
                  <td key={`${rowNumber}-${column}`} className={rowNumber === csv.focusedRow ? 'zy-csv-row-focus' : undefined}>
                    {renderCell(currentValue(rowNumber, column, row[column] ?? '', false), rowNumber, column, false)}
                  </td>
                ))}
              </>
            )
          }}
        />
      </div>
    </div>
  )

  function renderCell(value: string, row: number, column: number, isHeader: boolean) {
    const isActive = activeEdit?.row === row && activeEdit.column === column && activeEdit.isHeader === isHeader
    if (isActive) {
      const commonProps = {
        value: activeEdit.value,
        autoFocus: true,
        'aria-label': isHeader ? `编辑第 ${column + 1} 列表头` : `编辑第 ${row} 行第 ${column + 1} 列`,
        onChange: (event: { currentTarget: { value: string } }) => setActiveEdit((current) => current ? { ...current, value: event.currentTarget.value } : current),
        onBlur: finishEdit,
        onKeyDown: (event: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
          if (event.key === 'Escape') cancelEdit()
          if (event.key === 'Enter' && (isHeader || !event.shiftKey)) {
            event.preventDefault()
            finishEdit()
          }
        },
      }
      return isHeader ? <input className="zy-csv-cell-input" {...commonProps} /> : <textarea className="zy-csv-cell-input" rows={1} {...commonProps} />
    }
    if (!editable) return <span className="zy-csv-cell-text">{value}</span>
    return (
      <button
        className="zy-csv-cell-button"
        type="button"
        onClick={() => beginEdit({ row, column, originalValue: value, value, isHeader })}
      >{value || ' '}</button>
    )
  }
})

function editorPage(csv: ReadEntryResult['csv']): CsvEditorPage | undefined {
  return csv?.revision ? csv : undefined
}

function RawCsvFallback(props: { preview: ReadEntryResult; showPreviewStatus?: boolean }) {
  return (
    <div className="zy-csv-preview">
      {props.showPreviewStatus ? <div className="zy-preview-status" role="status">{statusText(props.preview)}</div> : null}
      <pre className="zy-csv-body" aria-label="CSV 预览文本">{props.preview.text}</pre>
    </div>
  )
}

function statusText(preview: ReadEntryResult): string {
  const csv = preview.csv
  const location = preview.view === 'search-hit' ? '显示命中附近' : '显示文件开头'
  const rows = csv ? `；显示第 ${csv.windowStartRow}–${csv.windowEndRow} 行，共 ${csv.totalRows} 行` : ''
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

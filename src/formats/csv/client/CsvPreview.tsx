import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RowsChangeData } from 'react-data-grid'
import type { EntryWriteChange } from '../../../model/request/entry-request.ts'
import type { TableEditorPage, TableEntryPreview, TableWindowData } from '../../../model/response/entry-response.ts'
import { buildPatch, emptyCsvChanges, storeEdit, type CsvChanges } from './csv-patch.ts'
import type { CsvHeaderEdit } from './csv-grid-cells.tsx'
import { cellField, type CsvGridRow } from './csv-grid-rows.ts'
import { CsvGrid } from './CsvGrid.tsx'

export type CsvEditorHandle = {
  getChange: () => EntryWriteChange | undefined
}

export type CsvPreviewProps = {
  preview: TableEntryPreview
  mode: 'read' | 'edit'
  showPreviewStatus?: boolean
  onLoadPage?: (startRow: number) => Promise<TableEditorPage>
}

/** 轻量 CSV 查看与单元格编辑用的 react-data-grid 表格。 */
export const CsvPreview = forwardRef<CsvEditorHandle, CsvPreviewProps>(function CsvPreview(props, ref) {
  const table = props.preview.table
  const [page, setPage] = useState<TableEditorPage | undefined>(() => editorPage(table))
  const [changes, setChanges] = useState<CsvChanges>(emptyCsvChanges)
  const [headerEdit, setHeaderEdit] = useState<CsvHeaderEdit | null>(null)
  const [pageBusy, setPageBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const requestId = useRef(0)
  const editable = props.mode === 'edit' && Boolean(page?.revision)

  useEffect(() => {
    requestId.current += 1
    setPage(editorPage(table))
    setChanges(emptyCsvChanges())
    setHeaderEdit(null)
    setPageBusy(false)
    setPageError('')
  }, [props.preview.path, table?.revision])

  useEffect(() => () => { requestId.current += 1 }, [])

  useImperativeHandle(ref, () => ({
    getChange: () => {
      if (!page?.revision) return undefined
      const patch = buildPatch(page.revision, changes)
      return patch ? { kind: 'table-patch' as const, patch } : undefined
    },
  }), [changes, page?.revision])

  if (!table || !page) return <RawCsvFallback preview={props.preview} showPreviewStatus={props.showPreviewStatus} />

  const startRow = page.windowStartRow || 1
  const previousStartRow = Math.max(1, startRow - Math.max(1, page.rows.length))
  const nextStartRow = page.windowEndRow + 1

  const commitCellChange = (row: number, column: number, originalValue: string, value: string) => {
    setChanges((current) => storeEdit(current, { row, column, originalValue, value, isHeader: false }))
  }
  const commitHeaderChange = (column: number, originalValue: string, value: string) => {
    setChanges((current) => storeEdit(current, { row: 0, column, originalValue, value, isHeader: true }))
  }

  const onRowsChange = (rows: CsvGridRow[], data: RowsChangeData<CsvGridRow>) => {
    for (const index of data.indexes) {
      const row = rows[index]
      const original = page.rows[index]
      if (!row || !original) continue
      for (let column = 0; column < page.headers.length; column += 1) {
        const value = String(row[cellField(column)] ?? '')
        const originalValue = original[column] ?? ''
        if (value !== originalValue) commitCellChange(startRow + index, column, originalValue, value)
      }
    }
  }

  const commitHeaderEdit = () => {
    if (!headerEdit) return
    const originalValue = page.headers[headerEdit.column] ?? ''
    if (headerEdit.value !== originalValue) commitHeaderChange(headerEdit.column, originalValue, headerEdit.value)
    setHeaderEdit(null)
  }

  const loadPage = async (target: number): Promise<void> => {
    if (!props.onLoadPage || pageBusy) return
    const nextRequest = requestId.current + 1
    requestId.current = nextRequest
    setPageBusy(true)
    setPageError('')
    try {
      const nextPage = await props.onLoadPage(target)
      if (requestId.current === nextRequest) {
        setHeaderEdit(null)
        if (nextPage.revision !== page.revision) {
          setChanges(emptyCsvChanges())
          setPageError('文件已变化，未保存的表格修改已清除')
        }
        setPage(nextPage)
      }
    } catch (error) {
      if (requestId.current === nextRequest) setPageError(error instanceof Error ? error.message : '读取表格分页失败')
    } finally {
      if (requestId.current === nextRequest) setPageBusy(false)
    }
  }

  return (
    <div className="zy-csv-preview">
      {props.showPreviewStatus ? <div className="zy-preview-status" role="status">{statusText(props.preview)}</div> : null}
      {editable ? (
        <div className="zy-csv-page-tools" aria-label="表格分页工具" aria-busy={pageBusy || undefined}>
          <span className="zy-csv-page-status" aria-live="polite">第 {page.windowStartRow || 0}–{page.windowEndRow || 0} 行，共 {page.totalRows} 行</span>
          <div className="zy-csv-page-actions">
            <button className="zy-csv-page-button" type="button" disabled={pageBusy || page.windowStartRow <= 1} onClick={() => void loadPage(previousStartRow)}>上一页</button>
            <button className="zy-csv-page-button" type="button" disabled={pageBusy || page.windowEndRow >= page.totalRows} onClick={() => void loadPage(nextStartRow)}>下一页</button>
          </div>
        </div>
      ) : null}
      {pageError ? <div className="zy-csv-page-error" role="alert">{pageError}</div> : null}
      <CsvGrid
        page={page}
        startRow={startRow}
        editable={editable}
        focusedRow={table.focusedRow}
        headerEdit={headerEdit}
        onHeaderEditStart={setHeaderEdit}
        onHeaderEditChange={(value: string) => setHeaderEdit((current) => (current ? { ...current, value } : current))}
        onHeaderEditCommit={commitHeaderEdit}
        onHeaderEditCancel={() => setHeaderEdit(null)}
        onRowsChange={onRowsChange}
      />
    </div>
  )
})

function editorPage(table: TableWindowData | undefined): TableEditorPage | undefined {
  if (!table?.revision) return undefined
  return { ...table, revision: table.revision }
}

function RawCsvFallback(props: { preview: TableEntryPreview; showPreviewStatus?: boolean }) {
  return (
    <div className="zy-csv-preview">
      {props.showPreviewStatus ? <div className="zy-preview-status" role="status">{statusText(props.preview)}</div> : null}
      <pre className="zy-csv-body" aria-label="CSV 预览文本">{props.preview.text}</pre>
    </div>
  )
}

function statusText(preview: TableEntryPreview): string {
  const table = preview.table
  const location = preview.view === 'search-hit' ? '显示命中附近' : '显示文件开头'
  const rows = table ? `；显示第 ${table.windowStartRow}–${table.windowEndRow} 行，共 ${table.totalRows} 行` : ''
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

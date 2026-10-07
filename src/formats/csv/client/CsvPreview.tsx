import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
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
  /** 提供时把分页工具交给宿主渲染（例如面板页脚），不再在表格上方就地展示。 */
  pageToolsSlot?: (tools: ReactNode) => void
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

  async function loadPage(target: number): Promise<void> {
    if (!page || !props.onLoadPage || pageBusy) return
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

  // 分页工具节点按页面状态缓存，供 slot 上交宿主或就地渲染；回调经 ref 取当次实现的 loadPage。
  const loadPageRef = useRef<((target: number) => Promise<void>) | undefined>(undefined)
  useEffect(() => {
    loadPageRef.current = loadPage
  })
  const pageTools = useMemo(() => {
    if (!page || !editable) return null
    const currentPage = page
    const previousStartRow = Math.max(1, (currentPage.windowStartRow || 1) - Math.max(1, currentPage.rows.length))
    return (
      <div className="zy-csv-page-tools" aria-label="表格分页工具" aria-busy={pageBusy || undefined}>
        <span className="zy-csv-page-status" aria-live="polite">第 {currentPage.windowStartRow || 0}–{currentPage.windowEndRow || 0} 行，共 {currentPage.totalRows} 行</span>
        <div className="zy-csv-page-actions">
          <Button variant="ghost" size="sm" type="button" disabled={pageBusy || currentPage.windowStartRow <= 1} onClick={() => void loadPageRef.current?.(previousStartRow)}>上一页</Button>
          <Button variant="ghost" size="sm" type="button" disabled={pageBusy || currentPage.windowEndRow >= currentPage.totalRows} onClick={() => void loadPageRef.current?.(currentPage.windowEndRow + 1)}>下一页</Button>
        </div>
      </div>
    )
  }, [editable, pageBusy, page])

  // 宿主提供 slot 时上交工具节点；节点销毁或不可用时回交 null 清理页脚。
  const pageToolsSlot = props.pageToolsSlot
  useEffect(() => {
    if (!pageToolsSlot || !pageTools) return
    pageToolsSlot(pageTools)
    return () => pageToolsSlot(null)
  }, [pageToolsSlot, pageTools])

  if (!table || !page) return <RawCsvFallback preview={props.preview} showPreviewStatus={props.showPreviewStatus} />

  const startRow = page.windowStartRow || 1

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

  return (
    <div className="zy-csv-preview">
      {props.showPreviewStatus ? <div className="zy-preview-status" role="status">{statusText(props.preview)}</div> : null}
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
      {pageToolsSlot ? null : pageTools}
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

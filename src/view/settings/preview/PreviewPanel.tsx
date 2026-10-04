import { useRef } from 'react'
import type { ReadEntryResponse } from '../../view-models.ts'
import { EntryPreviewContent, type EntryEditorHandle } from '../../../formats/entry-renderers.tsx'
import type { EntryWriteChange } from '../../../model/request/entry-request.ts'
import type { TableEditorPage } from '../../../model/response/entry-response.ts'
import { Note } from '../dialogs/DialogField.tsx'
import { CloseIcon } from '../Icons.tsx'
import { toTextFallback } from './preview-fallback.ts'

export type PreviewPanelProps = {
  preview: ReadEntryResponse
  error: string
  busy: boolean
  fallbackText?: string
  onClose: () => void
  onSave?: (change: EntryWriteChange) => void
  onLoadPage?: (startRow: number) => Promise<TableEditorPage>
}

/** 工作台右侧预览栏：随树节点选中常驻展示，可编辑条目直接在此保存。 */
export function PreviewPanel(props: PreviewPanelProps) {
  const form = useRef<HTMLFormElement>(null)
  const editorRef = useRef<EntryEditorHandle>(null)
  const fileName = props.preview.path.split('/').pop() || props.preview.path
  const displayPreview = props.preview.previewStatus === 'ready' || !props.fallbackText
    ? props.preview
    : toTextFallback(props.preview, props.fallbackText)
  const canEdit = displayPreview.format !== 'csv' || displayPreview.kind === 'table'
  return (
    <aside className="zy-preview-panel" aria-label={`预览 ${fileName}`}>
      <div className="zy-preview-head">
        <div className="zy-preview-head-copy">
          <div className="zy-preview-title"><span className="zy-preview-filename" title={props.preview.path}>{fileName}</span></div>
        </div>
        <button className="zy-preview-close" type="button" aria-label="关闭预览" onClick={props.onClose}><CloseIcon /></button>
      </div>
      {canEdit ? (
        <form
          ref={form}
          className="zy-preview-form"
          onSubmit={(event: { preventDefault: () => void }) => {
            event.preventDefault()
            const change = editorRef.current?.getChange()
            if (change) props.onSave?.(change)
          }}
        >
          <EntryPreviewContent preview={displayPreview} mode="edit" editorRef={editorRef} onLoadPage={props.onLoadPage} />
        </form>
      ) : (
        <div className="zy-preview-body">
          <EntryPreviewContent preview={displayPreview} mode="read" showPreviewStatus />
        </div>
      )}
      <Note text={props.error} />
      {canEdit ? (
        <div className="zy-preview-foot">
          <button className="zy-btn zy-primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>保存</button>
        </div>
      ) : null}
    </aside>
  )
}

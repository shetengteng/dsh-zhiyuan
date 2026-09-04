import { useRef } from 'react'
import { WorkbenchModal } from '../WorkbenchModal.tsx'
import type { ReadEntryResult } from '../../models.ts'
import { EntryPreviewContent, type EntryEditorHandle } from '../../../content/client-api.tsx'
import type { EntryWriteChange, TableEditorPage } from '../../../content/api.ts'
import { Note } from '../Dialogs.tsx'

export type PreviewDialogProps = {
  preview: ReadEntryResult
  editable: boolean
  deletable: boolean
  error: string
  busy: boolean
  fallbackText?: string
  onClose: () => void
  onSave?: (change: EntryWriteChange) => void
  onLoadPage?: (startRow: number) => Promise<TableEditorPage>
  onDelete?: () => void
}

export function PreviewDialog(props: PreviewDialogProps) {
  const form = useRef<HTMLFormElement>(null)
  const editorRef = useRef<EntryEditorHandle>(null)
  const fileName = props.preview.path.split('/').pop() || props.preview.path
  const displayPreview = props.preview.previewStatus === 'ready' || !props.fallbackText
    ? props.preview
    : toTextFallback(props.preview, props.fallbackText)
  const canEdit = props.editable && (displayPreview.format !== 'csv' || displayPreview.kind === 'table')
  const hasActions = canEdit || props.deletable
  return (
    <WorkbenchModal
      open
      onClose={props.onClose}
      title={fileName}
      className="zy-modal-wide"
      footer={hasActions ? (
        <div className="zy-footbar">
          {props.deletable ? <button className="zy-btn zy-danger" type="button" disabled={props.busy} onClick={props.onDelete}>删除</button> : null}
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          {canEdit ? <button className="zy-btn zy-primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>保存</button> : null}
        </div>
      ) : undefined}
    >
      {canEdit ? (
        <form
          ref={form}
          className="zy-preview-form"
          onSubmit={(event: { preventDefault: () => void }) => {
            event.preventDefault()
            const change = editorRef.current?.getChange()
            if (change) props.onSave?.(change)
            else props.onClose()
          }}
        >
          <EntryPreviewContent preview={displayPreview} mode="edit" editorRef={editorRef} onLoadPage={props.onLoadPage} />
        </form>
      ) : (
        <EntryPreviewContent preview={displayPreview} mode="read" showPreviewStatus />
      )}
      <Note text={props.error} />
    </WorkbenchModal>
  )
}

/** 命中失效时降级为纯文本展示；形态转换在弹框内完成，上层不感知格式。 */
function toTextFallback(preview: ReadEntryResult, fallbackText: string): ReadEntryResult {
  if (preview.kind === 'text') return { ...preview, text: fallbackText }
  const { table: _table, ...meta } = preview
  return { ...meta, kind: 'text', text: fallbackText }
}

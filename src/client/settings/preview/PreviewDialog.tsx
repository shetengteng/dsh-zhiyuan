import { useRef } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReadEntryResult } from '../../models.ts'
import { EntryPreviewContent, type EntryEditorHandle } from '../../../content/client-api.tsx'
import { EntryFormat, type CsvEditorPage, type CsvEntryPatch } from '../../../content/api.ts'
import { Note } from '../Dialogs.tsx'

export type PreviewDialogProps = {
  preview: ReadEntryResult
  editable: boolean
  deletable: boolean
  error: string
  busy: boolean
  fallbackText?: string
  onClose: () => void
  onSave?: (text: string) => void
  onSaveCsv?: (patch: CsvEntryPatch) => void
  onLoadCsvPage?: (startRow: number) => Promise<CsvEditorPage>
  onDelete?: () => void
}

export function PreviewDialog(props: PreviewDialogProps) {
  const form = useRef<HTMLFormElement>(null)
  const editorRef = useRef<EntryEditorHandle>(null)
  const fileName = props.preview.path.split('/').pop() || props.preview.path
  const displayPreview = props.preview.previewStatus === 'ready' || !props.fallbackText
    ? props.preview
    : { ...props.preview, text: props.fallbackText, csv: undefined }
  const canEdit = props.editable && props.preview.capabilities.canEdit
  const hasActions = canEdit || props.deletable
  return (
    <Modal
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
          onSubmit={(event: { preventDefault: () => void }) => {
            event.preventDefault()
            if (displayPreview.format === EntryFormat.Csv) {
              const patch = editorRef.current?.getCsvPatch?.()
              if (patch) props.onSaveCsv?.(patch)
              else props.onClose()
              return
            }
            props.onSave?.(editorRef.current?.getText() ?? displayPreview.text)
          }}
        >
          <EntryPreviewContent preview={displayPreview} mode="edit" editorRef={editorRef} onLoadCsvPage={props.onLoadCsvPage} />
        </form>
      ) : (
        <EntryPreviewContent preview={displayPreview} mode="read" showPreviewStatus />
      )}
      <Note text={props.error} />
    </Modal>
  )
}

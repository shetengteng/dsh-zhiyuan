import type { ReadEntryResponse } from '../../view-models.ts'
import { EntryPreviewContent } from '../../../formats/entry-renderers.tsx'
import { Note } from '../dialogs/DialogField.tsx'
import { Modal } from '../dialogs/Modal.tsx'
import { toTextFallback } from './preview-fallback.ts'

export type PreviewDialogProps = {
  preview: ReadEntryResponse
  error: string
  fallbackText?: string
  onClose: () => void
}

/** 搜索命中预览弹框：只读展示；关闭后回到搜索结果，树内条目改走右侧预览栏。 */
export function PreviewDialog(props: PreviewDialogProps) {
  const fileName = props.preview.path.split('/').pop() || props.preview.path
  const displayPreview = props.preview.previewStatus === 'ready' || !props.fallbackText
    ? props.preview
    : toTextFallback(props.preview, props.fallbackText)
  return (
    <Modal open onClose={props.onClose} title={fileName} className="zy-modal-wide">
      <EntryPreviewContent preview={displayPreview} mode="read" showPreviewStatus />
      <Note text={props.error} />
    </Modal>
  )
}

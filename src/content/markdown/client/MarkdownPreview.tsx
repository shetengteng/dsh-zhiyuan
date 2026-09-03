import type { RefObject } from 'react'
import type { ReadEntryResult } from '../../../client/models.ts'
import { MdEditor, type MdEditorHandle } from './MarkdownEditor.tsx'

export type MarkdownPreviewProps = {
  preview: ReadEntryResult
  mode: 'read' | 'edit'
  editorRef?: RefObject<MdEditorHandle | null>
  highlightText?: string
  showPreviewStatus?: boolean
}

export function MarkdownPreview(props: MarkdownPreviewProps) {
  if (props.mode === 'edit') {
    return <MdEditor ref={props.editorRef} key={props.preview.path} text={props.preview.text} readonly={false} />
  }
  return (
    <>
      {props.showPreviewStatus && props.preview.previewStatus !== 'ready' ? (
        <div className="zy-preview-status" role="status">文件已变化或命中位置已失效，未高亮旧命中</div>
      ) : null}
      <MdEditor
        key={props.preview.path}
        text={props.preview.text}
        readonly
        startLine={props.preview.windowStartLine}
        endLine={props.preview.windowEndLine}
        focusLine={props.preview.focusLine}
        highlightText={props.highlightText}
      />
    </>
  )
}

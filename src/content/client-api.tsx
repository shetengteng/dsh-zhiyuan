import type { ReactNode, RefObject } from 'react'
import { EntryFormat } from './api.ts'
import { CsvPreview } from './csv/client/CsvPreview.tsx'
import { MarkdownPreview, type MarkdownPreviewProps } from './markdown/client/MarkdownPreview.tsx'
import type { ReadEntryResult } from '../client/models.ts'
import type { CsvEditorPage, CsvEntryPatch } from './api.ts'

/** Client-facing editor handle; its concrete editor remains format-private. */
export type EntryEditorHandle = {
  getText: () => string
  getCsvPatch?: () => CsvEntryPatch | undefined
}

export type EntryPreviewContentProps = {
  preview: ReadEntryResult
  mode: 'read' | 'edit'
  editorRef?: RefObject<EntryEditorHandle | null>
  highlightText?: string
  showPreviewStatus?: boolean
  onLoadCsvPage?: (startRow: number) => Promise<CsvEditorPage>
}

type PreviewRenderer = (props: EntryPreviewContentProps) => ReactNode

const PREVIEW_RENDERERS: Record<ReadEntryResult['format'], PreviewRenderer> = {
  [EntryFormat.Markdown]: (props) => <MarkdownPreview {...toMarkdownPreviewProps(props)} />,
  [EntryFormat.Csv]: (props) => (
    <CsvPreview
      preview={props.preview}
      mode={props.mode}
      ref={props.editorRef}
      showPreviewStatus={props.showPreviewStatus}
      onLoadPage={props.onLoadCsvPage}
    />
  ),
}

/** Client-only preview dispatcher. It never reads local files or grants permissions. */
export function EntryPreviewContent(props: EntryPreviewContentProps) {
  return PREVIEW_RENDERERS[props.preview.format](props)
}

function toMarkdownPreviewProps(props: EntryPreviewContentProps): MarkdownPreviewProps {
  return {
    preview: props.preview,
    mode: props.mode,
    ...(props.editorRef === undefined ? {} : { editorRef: props.editorRef }),
    ...(props.highlightText === undefined ? {} : { highlightText: props.highlightText }),
    ...(props.showPreviewStatus === undefined ? {} : { showPreviewStatus: props.showPreviewStatus }),
  }
}

import type { ReactNode, RefObject } from 'react'
import { EntryContentKind } from './api.ts'
import type { EntryWriteChange, TableEditorPage } from './api.ts'
import { CsvPreview } from './csv/client/CsvPreview.tsx'
import { CsvTextPreview } from './csv/client/CsvTextPreview.tsx'
import { MarkdownPreview, type MarkdownPreviewProps } from './markdown/client/MarkdownPreview.tsx'
import type { ReadEntryResult, TableEntryPreview } from '../client/models.ts'

/** 面向 Client 的编辑器句柄；具体编辑器仍由格式模块私有。 */
export type EntryEditorHandle = {
  getChange: () => EntryWriteChange | undefined
}

export type EntryPreviewContentProps = {
  preview: ReadEntryResult
  mode: 'read' | 'edit'
  editorRef?: RefObject<EntryEditorHandle>
  highlightText?: string
  showPreviewStatus?: boolean
  onLoadPage?: (startRow: number) => Promise<TableEditorPage>
}

type PreviewRenderer = (props: EntryPreviewContentProps) => ReactNode

/** 按交互形态分发渲染组件；CSV 表格降级时保留其格式并展示原始文本。 */
const CONTENT_RENDERERS: Record<ReadEntryResult['kind'], PreviewRenderer> = {
  [EntryContentKind.Text]: (props) => props.preview.format === 'csv'
    ? <CsvTextPreview text={props.preview.text} />
    : <MarkdownPreview {...toMarkdownPreviewProps(props)} />,
  [EntryContentKind.Table]: (props) => (
    <CsvPreview
      preview={props.preview as TableEntryPreview}
      mode={props.mode}
      ref={props.editorRef}
      showPreviewStatus={props.showPreviewStatus}
      onLoadPage={props.onLoadPage}
    />
  ),
}

/** 仅 Client 使用的预览分发器。不读本地文件，也不授予权限。 */
export function EntryPreviewContent(props: EntryPreviewContentProps) {
  return CONTENT_RENDERERS[props.preview.kind](props)
}

function toMarkdownPreviewProps(props: EntryPreviewContentProps): MarkdownPreviewProps {
  return {
    preview: props.preview as MarkdownPreviewProps['preview'],
    mode: props.mode,
    ...(props.editorRef === undefined ? {} : { editorRef: props.editorRef }),
    ...(props.highlightText === undefined ? {} : { highlightText: props.highlightText }),
    ...(props.showPreviewStatus === undefined ? {} : { showPreviewStatus: props.showPreviewStatus }),
  }
}

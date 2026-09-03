import { createHash } from 'node:crypto'
import { CSV_EDITOR_PAGE_SIZE, CSV_PREVIEW_MAX_BYTES } from '../../../identity.ts'
import { EntryFormat, EntryPreviewView, EntryReadMode } from '../../api.ts'
import { splitPhysicalLines } from '../../shared/line-window.ts'
import { resolvePreviewFocus } from '../../shared/preview-focus.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import { KbError } from '../../../types.ts'
import { createCsvEditorPage, createCsvPreviewWindow, parseCsvDocument } from './csv-document.ts'
import { readValidatedUtf8Csv } from './encoding.ts'
import type { EntryPreviewContext } from '../../host-contract.ts'
import type { ReadEntryResult } from '../../../types.ts'

export async function readCsvPreview(context: EntryPreviewContext): Promise<ReadEntryResult> {
  const validation = await readValidatedUtf8Csv(context.absolutePath, CSV_PREVIEW_MAX_BYTES)
  if (!validation.ok) {
    const code = validation.code === 'file_too_large' ? 'preview_too_large' : validation.code
    const message = validation.code === 'file_too_large' ? 'CSV 预览文件超过读取上限' : validation.message
    throw new KbError(code, message)
  }
  const text = stripUtf8Bom(validation.value.text)
  const revision = createHash('sha256').update(validation.value.bytes).digest('hex')
  const document = parseCsvDocument(text)
  if (context.options.readMode === EntryReadMode.Edit) {
    const csv = createCsvEditorPage(document, 1, CSV_EDITOR_PAGE_SIZE, revision)
    const lastRecord = csv.windowEndRow ? document.records[csv.windowEndRow - 1] : document.header
    return {
      path: context.relativePath,
      text: '',
      format: EntryFormat.Csv,
      view: context.options.view ?? EntryPreviewView.Tree,
      windowStartLine: document.header.startLine,
      windowEndLine: lastRecord?.endLine ?? document.header.endLine,
      truncation: csv.complete ? 'none' : 'after',
      totalChars: text.length,
      previewStatus: 'ready',
      capabilities: { canEdit: true },
      csv,
    }
  }
  const lines = splitPhysicalLines(text)
  const focus = resolvePreviewFocus(lines, revision, context.options)
  const window = createCsvPreviewWindow(
    document,
    false,
    focus.hasRequestedFocus ? focus.requestedLine : undefined,
  )
  const previewCsv = focus.previewStatus === 'ready' || window.csv.focusedRow === undefined
    ? window.csv
    : { ...window.csv, focusedRow: undefined }
  const csv = { ...previewCsv, revision }
  return {
    path: context.relativePath,
    text: text.slice(window.textStartOffset, window.textEndOffset),
    format: EntryFormat.Csv,
    view: focus.view,
    windowStartLine: window.windowStartLine,
    windowEndLine: window.windowEndLine,
    truncation: window.truncation,
    totalChars: text.length,
    previewStatus: focus.previewStatus,
    capabilities: { canEdit: true },
    csv,
    ...(focus.focusLine === undefined ? {} : { focusLine: focus.focusLine }),
    ...(focus.focusColumnByte === undefined ? {} : { focusColumnByte: focus.focusColumnByte }),
  }
}

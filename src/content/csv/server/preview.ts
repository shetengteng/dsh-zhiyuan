import { CSV_PREVIEW_MAX_BYTES, TABLE_EDITOR_PAGE_SIZE } from '../../../identity.ts'
import { EntryContentKind, EntryFormat, EntryPreviewView, EntryReadMode } from '../../api.ts'
import { splitPhysicalLines } from '../../shared/line-window.ts'
import { resolvePreviewFocus } from '../../shared/preview-focus.ts'
import { KbError } from '../../../types.ts'
import { createCsvEditorPage, createCsvPreviewWindow } from './csv-document.ts'
import { readCsvDocument } from './editor.ts'
import type { EntryReadContext } from '../../host-contract.ts'
import type { ReadEntryResult } from '../../../types.ts'

export async function readCsvPreview(context: EntryReadContext): Promise<ReadEntryResult> {
  let loaded
  try {
    loaded = await readCsvDocument(context.absolutePath, CSV_PREVIEW_MAX_BYTES)
  } catch (error) {
    throw remapPreviewReadError(error)
  }
  if (context.options.readMode === EntryReadMode.Edit) {
    return csvEditPreview(context, loaded)
  }
  return csvReadPreview(context, loaded)
}

function csvEditPreview(
  context: EntryReadContext,
  loaded: Awaited<ReturnType<typeof readCsvDocument>>,
): ReadEntryResult {
  const table = createCsvEditorPage(loaded.document, 1, TABLE_EDITOR_PAGE_SIZE, loaded.revision)
  const lastRecord = table.windowEndRow ? loaded.document.records[table.windowEndRow - 1] : loaded.document.header
  return {
    path: context.relativePath,
    kind: EntryContentKind.Table,
    text: '',
    table,
    format: EntryFormat.Csv,
    view: context.options.view ?? EntryPreviewView.Tree,
    windowStartLine: loaded.document.header.startLine,
    windowEndLine: lastRecord?.endLine ?? loaded.document.header.endLine,
    truncation: table.complete ? 'none' : 'after',
    totalChars: loaded.text.length,
    previewStatus: 'ready',
  }
}

function csvReadPreview(
  context: EntryReadContext,
  loaded: Awaited<ReturnType<typeof readCsvDocument>>,
): ReadEntryResult {
  const lines = splitPhysicalLines(loaded.text)
  const focus = resolvePreviewFocus(lines, loaded.revision, context.options)
  const window = createCsvPreviewWindow(
    loaded.document,
    false,
    focus.hasRequestedFocus ? focus.requestedLine : undefined,
  )
  const previewTable = focus.previewStatus === 'ready' || window.csv.focusedRow === undefined
    ? window.csv
    : { ...window.csv, focusedRow: undefined }
  return {
    path: context.relativePath,
    kind: EntryContentKind.Table,
    text: loaded.text.slice(window.textStartOffset, window.textEndOffset),
    table: { ...previewTable, revision: loaded.revision },
    format: EntryFormat.Csv,
    view: focus.view,
    windowStartLine: window.windowStartLine,
    windowEndLine: window.windowEndLine,
    truncation: window.truncation,
    totalChars: loaded.text.length,
    previewStatus: focus.previewStatus,
    ...(focus.focusLine === undefined ? {} : { focusLine: focus.focusLine }),
    ...(focus.focusColumnByte === undefined ? {} : { focusColumnByte: focus.focusColumnByte }),
  }
}

function remapPreviewReadError(error: unknown): unknown {
  if (error instanceof KbError && error.code === 'file_too_large') {
    return new KbError('preview_too_large', 'CSV 预览文件超过读取上限')
  }
  return error
}

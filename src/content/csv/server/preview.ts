import { createHash } from 'node:crypto'
import { CSV_PREVIEW_MAX_BYTES, CSV_PREVIEW_MAX_CHARS, SEARCH_CONTEXT } from '../../../identity.ts'
import { EntryFormat } from '../../api.ts'
import { chooseFocusedWindow, chooseLeadingWindow, splitPhysicalLines, truncationFor } from '../../shared/line-window.ts'
import { resolvePreviewFocus } from '../../shared/preview-focus.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import { KbError } from '../../../types.ts'
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
  const lines = splitPhysicalLines(text)
  const focus = resolvePreviewFocus(lines, createHash('sha256').update(validation.value.bytes).digest('hex'), context.options)
  const window = focus.hasRequestedFocus
    ? chooseFocusedWindow(lines, focus.requestedLine ?? 1, SEARCH_CONTEXT, CSV_PREVIEW_MAX_CHARS)
    : chooseLeadingWindow(lines, CSV_PREVIEW_MAX_CHARS)
  return {
    path: context.relativePath,
    text: lines.slice(window.start - 1, window.end).join('\n'),
    format: EntryFormat.Csv,
    view: focus.view,
    windowStartLine: window.start,
    windowEndLine: window.end,
    truncation: truncationFor(window, lines.length),
    totalChars: text.length,
    previewStatus: focus.previewStatus,
    capabilities: { canEdit: false },
    ...(focus.focusLine === undefined ? {} : { focusLine: focus.focusLine }),
    ...(focus.focusColumnByte === undefined ? {} : { focusColumnByte: focus.focusColumnByte }),
  }
}

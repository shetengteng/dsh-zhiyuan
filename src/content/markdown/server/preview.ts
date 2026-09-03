import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { EntryFormat } from '../../api.ts'
import { splitPhysicalLines, truncationFor } from '../../shared/line-window.ts'
import { resolvePreviewFocus } from '../../shared/preview-focus.ts'
import type { EntryPreviewContext } from '../../host-contract.ts'
import type { ReadEntryResult } from '../../../types.ts'

export async function readMarkdownPreview(context: EntryPreviewContext): Promise<ReadEntryResult> {
  const bytes = await readFile(context.absolutePath)
  const text = bytes.toString('utf8')
  const lines = splitPhysicalLines(text)
  const focus = resolvePreviewFocus(lines, createHash('sha256').update(bytes).digest('hex'), context.options)
  return {
    path: context.relativePath,
    text,
    format: EntryFormat.Markdown,
    view: focus.view,
    windowStartLine: 1,
    windowEndLine: lines.length,
    truncation: truncationFor({ start: 1, end: lines.length }, lines.length),
    totalChars: text.length,
    previewStatus: focus.previewStatus,
    capabilities: { canEdit: true },
    ...(focus.focusLine === undefined ? {} : { focusLine: focus.focusLine }),
    ...(focus.focusColumnByte === undefined ? {} : { focusColumnByte: focus.focusColumnByte }),
  }
}

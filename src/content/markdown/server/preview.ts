import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { EntryContentKind, EntryFormat } from '../../api.ts'
import { splitPhysicalLines, truncationFor } from '../../shared/line-window.ts'
import { resolvePreviewFocus } from '../../shared/preview-focus.ts'
import type { EntryReadContext } from '../../host-contract.ts'
import type { ReadEntryResult } from '../../../types.ts'

export async function readMarkdownPreview(context: EntryReadContext): Promise<ReadEntryResult> {
  const bytes = await readFile(context.absolutePath)
  const text = bytes.toString('utf8')
  const lines = splitPhysicalLines(text)
  const focus = resolvePreviewFocus(lines, createHash('sha256').update(bytes).digest('hex'), context.options)
  return {
    path: context.relativePath,
    kind: EntryContentKind.Text,
    text,
    format: EntryFormat.Markdown,
    view: focus.view,
    windowStartLine: 1,
    windowEndLine: lines.length,
    truncation: truncationFor({ start: 1, end: lines.length }, lines.length),
    totalChars: text.length,
    previewStatus: focus.previewStatus,
    ...(focus.focusLine === undefined ? {} : { focusLine: focus.focusLine }),
    ...(focus.focusColumnByte === undefined ? {} : { focusColumnByte: focus.focusColumnByte }),
  }
}

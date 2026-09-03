import { EntryFormat, SourceFormat } from '../api.ts'
import type { ContentFormatModule, EntryFormatHandler, SourceFormatHandler } from '../host-contract.ts'
import { prepareMarkdownImport } from './server/import.ts'
import { readMarkdownPreview } from './server/preview.ts'
import { readMarkdownForSearch } from './server/search.ts'
import { writeMarkdownEntry } from './server/write.ts'

const markdownSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Markdown,
  sourceExtensions: ['.md', '.markdown'],
  prepareImport: prepareMarkdownImport,
}

const plainTextSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.PlainText,
  sourceExtensions: ['.txt'],
  prepareImport: prepareMarkdownImport,
}

const markdownEntryHandler: EntryFormatHandler = {
  format: EntryFormat.Markdown,
  entryExtensions: ['.md', '.txt', '.markdown'],
  canEdit: true,
  readPreview: readMarkdownPreview,
  readForSearch: readMarkdownForSearch,
  writeEntry: writeMarkdownEntry,
}

/** Markdown/Text's only registration surface for the Host registry. */
export const markdownContentFormat: ContentFormatModule = {
  sourceHandlers: [markdownSourceHandler, plainTextSourceHandler],
  entryHandlers: [markdownEntryHandler],
}

import { EntryFormat, SourceFormat } from '../api.ts'
import type { ContentFormatModule, EntryFormatHandler, SourceFormatHandler } from '../host-contract.ts'
import { prepareMarkdownImport } from './server/import.ts'
import { readMarkdownPreview } from './server/preview.ts'
import { readMarkdownForSearch } from './server/search.ts'
import { readMarkdownPage, writeMarkdownContent } from './server/write.ts'

const markdownSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Markdown,
  sourceExtensions: ['.md', '.markdown'],
  prepareImport: async (context) => [await prepareMarkdownImport(context)],
}

const plainTextSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.PlainText,
  sourceExtensions: ['.txt'],
  prepareImport: async (context) => [await prepareMarkdownImport(context)],
}

const markdownEntryHandler: EntryFormatHandler = {
  format: EntryFormat.Markdown,
  entryExtensions: ['.md', '.txt', '.markdown'],
  readContent: readMarkdownPreview,
  readPage: readMarkdownPage,
  writeContent: writeMarkdownContent,
  readForSearch: readMarkdownForSearch,
}

/** Markdown/文本在 Host registry 上的唯一注册面。 */
export const markdownContentFormat: ContentFormatModule = {
  sourceHandlers: [markdownSourceHandler, plainTextSourceHandler],
  entryHandlers: [markdownEntryHandler],
}

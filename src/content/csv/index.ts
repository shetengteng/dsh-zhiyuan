import { EntryFormat, SourceFormat } from '../api.ts'
import type { ContentFormatModule, EntryFormatHandler, SourceFormatHandler } from '../host-contract.ts'
import { prepareCsvImport } from './server/import.ts'
import { readCsvPage } from './server/editor.ts'
import { readCsvPreview } from './server/preview.ts'
import { readCsvForSearch } from './server/search.ts'
import { writeCsvContent } from './server/write.ts'

const csvSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Csv,
  sourceExtensions: ['.csv'],
  prepareImport: async (context) => [await prepareCsvImport(context)],
}

const csvEntryHandler: EntryFormatHandler = {
  format: EntryFormat.Csv,
  entryExtensions: ['.csv'],
  readContent: readCsvPreview,
  readPage: readCsvPage,
  writeContent: writeCsvContent,
  readForSearch: readCsvForSearch,
}

/** CSV 在 Host registry 上的唯一注册面。 */
export const csvContentFormat: ContentFormatModule = {
  sourceHandlers: [csvSourceHandler],
  entryHandlers: [csvEntryHandler],
}

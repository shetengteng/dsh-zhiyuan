import { EntryFormat, SourceFormat } from '../api.ts'
import type { ContentFormatModule, EntryFormatHandler, SourceFormatHandler } from '../host-contract.ts'
import { prepareCsvImport } from './server/import.ts'
import { readCsvPreview } from './server/preview.ts'
import { readCsvForSearch } from './server/search.ts'
import { writeCsvEntry } from './server/write.ts'

const csvSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Csv,
  sourceExtensions: ['.csv'],
  prepareImport: prepareCsvImport,
}

const csvEntryHandler: EntryFormatHandler = {
  format: EntryFormat.Csv,
  entryExtensions: ['.csv'],
  canEdit: true,
  readPreview: readCsvPreview,
  readForSearch: readCsvForSearch,
  writeEntry: writeCsvEntry,
}

/** CSV's only registration surface for the Host registry. */
export const csvContentFormat: ContentFormatModule = {
  sourceHandlers: [csvSourceHandler],
  entryHandlers: [csvEntryHandler],
}

import type { CsvEditorPage, CsvEntryPatch, EntryFormat, EntryPreviewOptions, SourceFormat } from './api.ts'
import type { PreparedEntry } from './shared/ingest-output.ts'
import type { SearchDocument } from './shared/search-document.ts'
import type { ReadEntryResult } from '../types.ts'

export type PrepareImportContext = {
  sourcePath: string
  sourceName: string
  maxFileBytes: number
}

export type EntryPathContext = {
  absolutePath: string
  relativePath: string
}

export type EntryPreviewContext = EntryPathContext & {
  options: EntryPreviewOptions
}

export type EntryWriteContext = EntryPathContext & {
  text: string
  maxFileBytes: number
  maxBaseBytes: number
  baseBytesWithoutEntry: number
}

export type EntryCsvPageContext = EntryPathContext & {
  startRow: number
  pageSize: number
}

export type EntryCsvPatchContext = EntryPathContext & {
  patch: CsvEntryPatch
  maxFileBytes: number
  maxBaseBytes: number
  baseBytesWithoutEntry: number
}

export type SourceFormatHandler = {
  sourceFormat: SourceFormat
  sourceExtensions: readonly string[]
  prepareImport: (context: PrepareImportContext) => Promise<PreparedEntry[]>
}

export type EntryFormatHandler = {
  format: EntryFormat
  entryExtensions: readonly string[]
  canEdit: boolean
  readPreview: (context: EntryPreviewContext) => Promise<ReadEntryResult>
  readForSearch: (context: EntryPathContext) => Promise<SearchDocument>
  writeEntry?: (context: EntryWriteContext) => Promise<void>
  readCsvEditorPage?: (context: EntryCsvPageContext) => Promise<CsvEditorPage>
  writeCsvPatch?: (context: EntryCsvPatchContext) => Promise<void>
}

/** 单个文件类型模块的内部注册契约。 */
export type ContentFormatModule = {
  sourceHandlers: readonly SourceFormatHandler[]
  entryHandlers: readonly EntryFormatHandler[]
}

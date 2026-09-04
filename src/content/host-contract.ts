import type { EntryPreviewOptions, EntryFormat, EntryWriteChange, SourceFormat, TableEditorPage } from './api.ts'
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

export type EntryReadContext = EntryPathContext & {
  options: EntryPreviewOptions
}

export type EntryPageContext = EntryPathContext & {
  startRow: number
  pageSize: number
}

export type EntryWriteContext = EntryPathContext & {
  change: EntryWriteChange
  maxFileBytes: number
  maxBaseBytes: number
  baseBytesWithoutEntry: number
}

export type SourceFormatHandler = {
  sourceFormat: SourceFormat
  sourceExtensions: readonly string[]
  prepareImport: (context: PrepareImportContext) => Promise<PreparedEntry[]>
}

/**
 * 条目格式契约。所有入口都是格式无关的通用动作；
 * 不支持的操作由实现抛出 KbError，route 不做前置格式判断。
 */
export type EntryFormatHandler = {
  format: EntryFormat
  entryExtensions: readonly string[]
  readContent: (context: EntryReadContext) => Promise<ReadEntryResult>
  readPage: (context: EntryPageContext) => Promise<TableEditorPage>
  writeContent: (context: EntryWriteContext) => Promise<void>
  readForSearch: (context: EntryPathContext) => Promise<SearchDocument>
}

/** 单个文件类型模块的内部注册契约。 */
export type ContentFormatModule = {
  sourceHandlers: readonly SourceFormatHandler[]
  entryHandlers: readonly EntryFormatHandler[]
}

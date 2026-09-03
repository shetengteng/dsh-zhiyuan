import { extname } from 'node:path'
import { EntryFormat } from './api.ts'
import { csvContentFormat } from './csv/index.ts'
import { markdownContentFormat } from './markdown/index.ts'
import type { ContentFormatModule, EntryCsvPageContext, EntryCsvPatchContext, EntryFormatHandler, EntryPathContext, EntryPreviewContext, EntryWriteContext, PrepareImportContext, SourceFormatHandler } from './host-contract.ts'
import type { SourceFormat, EntryFormat as EntryFormatValue } from './api.ts'
import type { CsvEditorPage } from './api.ts'
import type { PreparedEntry } from './shared/ingest-output.ts'
import type { SearchDocument } from './shared/search-document.ts'
import type { ReadEntryResult } from '../types.ts'
import { KbError } from '../types.ts'

type SourceRoute = {
  format: SourceFormat
  handler: SourceFormatHandler
}

function extensionOf(filePath: string): string {
  return extname(filePath).toLowerCase()
}

function registerSourceHandlers(handlers: readonly SourceFormatHandler[]): Map<string, SourceRoute> {
  const routes = new Map<string, SourceRoute>()
  for (const handler of handlers) {
    for (const extension of handler.sourceExtensions) {
      if (routes.has(extension)) throw new Error(`重复的导入格式后缀：${extension}`)
      routes.set(extension, { format: handler.sourceFormat, handler })
    }
  }
  return routes
}

function registerEntryHandlers(handlers: readonly EntryFormatHandler[]): Map<string, EntryFormatHandler> {
  const routes = new Map<string, EntryFormatHandler>()
  for (const handler of handlers) {
    for (const extension of handler.entryExtensions) {
      if (routes.has(extension)) throw new Error(`重复的库内格式后缀：${extension}`)
      routes.set(extension, handler)
    }
  }
  return routes
}

const CONTENT_FORMAT_MODULES: readonly ContentFormatModule[] = [markdownContentFormat, csvContentFormat]
const SOURCE_HANDLERS = CONTENT_FORMAT_MODULES.flatMap((module) => module.sourceHandlers)
const ENTRY_HANDLERS = CONTENT_FORMAT_MODULES.flatMap((module) => module.entryHandlers)
const SOURCE_ROUTES = registerSourceHandlers(SOURCE_HANDLERS)
const ENTRY_ROUTES = registerEntryHandlers(ENTRY_HANDLERS)
const SOURCE_EXTENSIONS = [...SOURCE_ROUTES.keys()]
const ENTRY_EXTENSIONS = [...ENTRY_ROUTES.keys()]

function sourceHandlerForPath(sourcePath: string): SourceFormatHandler {
  const route = SOURCE_ROUTES.get(extensionOf(sourcePath))
  if (!route) throw new KbError('ext_denied', `只支持 ${SOURCE_EXTENSIONS.join(' / ')}`)
  return route.handler
}

function entryHandlerForPath(relativePath: string): EntryFormatHandler {
  const handler = ENTRY_ROUTES.get(extensionOf(relativePath))
  if (!handler) throw new KbError('ext_denied', '只支持库内白名单文件')
  return handler
}

/** The only Host API implementation for file-type routing. */
export const contentRegistry = {
  sourceExtensions: (): readonly string[] => [...SOURCE_EXTENSIONS],
  entryExtensions: (): readonly string[] => [...ENTRY_EXTENSIONS],
  searchGlobs: (): string[] => ENTRY_EXTENSIONS.map((extension) => `*${extension}`),
  sourceFormatForPath: (sourcePath: string): SourceFormat | undefined => SOURCE_ROUTES.get(extensionOf(sourcePath))?.format,
  entryFormatForPath: (relativePath: string): EntryFormatValue | undefined => ENTRY_ROUTES.get(extensionOf(relativePath))?.format,
  isStoredEntryPath: (relativePath: string): boolean => ENTRY_ROUTES.has(extensionOf(relativePath)),
  prepareImport: (context: PrepareImportContext): Promise<PreparedEntry> => sourceHandlerForPath(context.sourcePath).prepareImport(context),
  readPreview: (context: EntryPreviewContext): Promise<ReadEntryResult> => entryHandlerForPath(context.relativePath).readPreview(context),
  readForSearch: (context: EntryPathContext): Promise<SearchDocument> => entryHandlerForPath(context.relativePath).readForSearch(context),
  writeEntry: async (context: EntryWriteContext): Promise<void> => {
    const handler = entryHandlerForPath(context.relativePath)
    if (!handler.canEdit || !handler.writeEntry) {
      const label = handler.format === EntryFormat.Csv ? 'CSV' : '该文件格式'
      throw new KbError('read_only_format', `${label} 只读，不能在知源中修改`)
    }
    await handler.writeEntry(context)
  },
  readCsvEditorPage: async (context: EntryCsvPageContext): Promise<CsvEditorPage> => {
    const handler = entryHandlerForPath(context.relativePath)
    if (handler.format !== EntryFormat.Csv || !handler.readCsvEditorPage) {
      throw new KbError('read_only_format', '该文件不支持 CSV 表格分页读取')
    }
    return handler.readCsvEditorPage(context)
  },
  writeCsvPatch: async (context: EntryCsvPatchContext): Promise<void> => {
    const handler = entryHandlerForPath(context.relativePath)
    if (handler.format !== EntryFormat.Csv || !handler.canEdit || !handler.writeCsvPatch) {
      throw new KbError('read_only_format', '该文件不支持 CSV 表格编辑')
    }
    await handler.writeCsvPatch(context)
  },
}

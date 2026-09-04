import { extname } from 'node:path'
import { csvContentFormat } from './csv/index.ts'
import { markdownContentFormat } from './markdown/index.ts'
import type { ContentFormatModule, EntryFormatHandler, EntryPageContext, EntryPathContext, EntryReadContext, EntryWriteContext, PrepareImportContext, SourceFormatHandler } from './host-contract.ts'
import type { SourceFormat, EntryFormat as EntryFormatValue } from './api.ts'
import type { PreparedEntry } from './shared/ingest-output.ts'
import type { SearchDocument } from './shared/search-document.ts'
import type { ReadEntryResult } from '../types.ts'
import type { TableEditorPage } from './api.ts'
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

/** 文件类型路由的唯一 Host 实现。只做扩展名路由和委托，不感知具体格式。 */
export const contentRegistry = {
  sourceExtensions: (): readonly string[] => [...SOURCE_EXTENSIONS],
  entryExtensions: (): readonly string[] => [...ENTRY_EXTENSIONS],
  searchGlobs: (): string[] => ENTRY_EXTENSIONS.map((extension) => `*${extension}`),
  sourceFormatForPath: (sourcePath: string): SourceFormat | undefined => SOURCE_ROUTES.get(extensionOf(sourcePath))?.format,
  entryFormatForPath: (relativePath: string): EntryFormatValue | undefined => ENTRY_ROUTES.get(extensionOf(relativePath))?.format,
  isStoredEntryPath: (relativePath: string): boolean => ENTRY_ROUTES.has(extensionOf(relativePath)),
  prepareImport: (context: PrepareImportContext): Promise<PreparedEntry[]> => sourceHandlerForPath(context.sourcePath).prepareImport(context),
  readContent: (context: EntryReadContext): Promise<ReadEntryResult> => entryHandlerForPath(context.relativePath).readContent(context),
  readPage: (context: EntryPageContext): Promise<TableEditorPage> => entryHandlerForPath(context.relativePath).readPage(context),
  writeContent: (context: EntryWriteContext): Promise<void> => entryHandlerForPath(context.relativePath).writeContent(context),
  readForSearch: (context: EntryPathContext): Promise<SearchDocument> => entryHandlerForPath(context.relativePath).readForSearch(context),
}

/** 内容导入、预览、检索与写入的稳定 Host 边界。 */
export { contentRegistry } from './host-registry.ts'
export { EntryFormat, EntryPreviewView, EntryReadMode, SourceFormat, isEntryFormat, isEntryPreviewView, isEntryReadMode } from './api.ts'

export type {
  CsvCellChange,
  CsvEditorPage,
  CsvEntryPatch,
  CsvHeaderChange,
  CsvPreviewData,
  EntryCapabilities,
  EntryReadMode,
  EntryPreviewOptions,
  PreviewStatus,
  PreviewTruncation,
} from './api.ts'

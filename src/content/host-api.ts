/** 内容导入、预览、检索与写入的稳定 Host 边界。 */
export { contentRegistry } from './host-registry.ts'
export { EntryContentKind, EntryFormat, EntryPreviewView, EntryReadMode, SourceFormat, isEntryContentKind, isEntryFormat, isEntryPreviewView, isEntryReadMode } from './api.ts'
export { parseEntryWriteChange } from './shared/table-patch.ts'

export type {
  EntryContentKind,
  EntryPreviewOptions,
  EntryReadMode,
  EntryWriteChange,
  PreviewStatus,
  PreviewTruncation,
  TableCellChange,
  TableEditorPage,
  TableHeaderChange,
  TablePatch,
  TableWindowData,
} from './api.ts'

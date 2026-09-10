/** 内容导入、预览、检索与写入的稳定 Host 边界。 */
export { contentRegistry } from './host-registry.ts'
export { EntryContentKind, EntryFormat, EntryPreviewView, EntryReadMode, SourceFormat, isEntryContentKind, isEntryFormat, isEntryPreviewView, isEntryReadMode } from '../model/content-contract.ts'
export { parseEntryWriteChange } from './shared/table-patch.ts'

export type {
  EntryPreviewOptions,
  EntryWriteChange,
  TableCellChange,
  TableHeaderChange,
  TablePatch,
} from '../model/request/entry-request.ts'

export type {
  PreviewStatus,
  PreviewTruncation,
  TableEditorPage,
  TableWindowData,
} from '../model/response/entry-response.ts'

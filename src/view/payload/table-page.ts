import type { TableEditorPage } from '../../model/response/entry-response.ts'
import { isTableWindowData } from './read-entry.ts'

function isTableEditorPage(value: unknown): value is TableEditorPage {
  return isTableWindowData(value) && typeof value.revision === 'string'
}

/** 收窄 loopback Host RPC 返回的表格编辑分页。 */
export function parseTableEditorPage(value: unknown): TableEditorPage {
  if (!isTableEditorPage(value)) throw new Error('Host 返回的表格分页数据无效')
  return value
}

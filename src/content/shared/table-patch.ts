import { CSV_MAX_PATCH_CHANGES, CSV_MAX_PHYSICAL_LINE_BYTES } from '../../identity.ts'
import type { EntryWriteChange, TableCellChange, TableHeaderChange, TablePatch } from '../api.ts'
import { KbError } from '../../types.ts'

const REVISION_PATTERN = /^[a-f0-9]{64}$/u

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new KbError('csv_patch_invalid', '表格修改数据无效')
  }
  return value as Record<string, unknown>
}

function requireNonNegativeInteger(data: Record<string, unknown>, field: string): number {
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new KbError('csv_patch_invalid', `${field} 必须是非负整数`)
  }
  return value
}

function requirePositiveInteger(data: Record<string, unknown>, field: string): number {
  const value = data[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError('csv_patch_invalid', `${field}必须是正整数`)
  }
  return value
}

function requireTableCellValue(data: Record<string, unknown>): string {
  const value = data.value
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > CSV_MAX_PHYSICAL_LINE_BYTES) {
    throw new KbError('csv_patch_invalid', '单元格内容过长')
  }
  return value
}

function requireChangeArray(data: Record<string, unknown>, field: string): Record<string, unknown>[] {
  const value = data[field]
  if (!Array.isArray(value)) throw new KbError('csv_patch_invalid', `${field} 必须是数组`)
  return value.map(asRecord)
}

function assertTableCellValue(value: string): void {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > CSV_MAX_PHYSICAL_LINE_BYTES) {
    throw new KbError('csv_patch_invalid', '单元格内容过长')
  }
}

/** RPC 收窄与编辑器应用共用的 shape 规则。不检查行列越界。 */
export function assertTablePatchShape(patch: TablePatch): void {
  if (!REVISION_PATTERN.test(patch.revision)) throw new KbError('csv_patch_invalid', '表格版本标识无效')
  if (!Array.isArray(patch.headerChanges) || !Array.isArray(patch.cellChanges)) {
    throw new KbError('csv_patch_invalid', '表格修改数据无效')
  }
  if (patch.headerChanges.length + patch.cellChanges.length > CSV_MAX_PATCH_CHANGES) {
    throw new KbError('csv_patch_invalid', `一次最多修改 ${CSV_MAX_PATCH_CHANGES} 个单元格`)
  }
  for (const change of patch.headerChanges) assertTableCellValue(change.value)
  for (const change of patch.cellChanges) assertTableCellValue(change.value)
}

/** 把不可信的 RPC patch 收窄为类型化的表格 patch。 */
export function parseTablePatch(value: unknown): TablePatch {
  const patch = asRecord(value)
  const revision = patch.revision
  if (typeof revision !== 'string') throw new KbError('csv_patch_invalid', '表格版本标识无效')
  const headerChanges: TableHeaderChange[] = requireChangeArray(patch, 'headerChanges').map((change) => ({
    column: requireNonNegativeInteger(change, 'column'),
    value: requireTableCellValue(change),
  }))
  const cellChanges: TableCellChange[] = requireChangeArray(patch, 'cellChanges').map((change) => ({
    row: requirePositiveInteger(change, 'row'),
    column: requireNonNegativeInteger(change, 'column'),
    value: requireTableCellValue(change),
  }))
  const parsed = { revision, headerChanges, cellChanges }
  assertTablePatchShape(parsed)
  return parsed
}

/** 把不可信的 RPC 写入请求收窄为判别联合的 EntryWriteChange。 */
export function parseEntryWriteChange(value: unknown): EntryWriteChange {
  const record = asRecord(value)
  if (record.kind === 'text') {
    if (typeof record.text !== 'string') throw new KbError('invalid_field', 'text 修改必须是字符串')
    return { kind: 'text', text: record.text }
  }
  if (record.kind === 'table-patch') {
    return { kind: 'table-patch', patch: parseTablePatch(record.patch) }
  }
  throw new KbError('invalid_field', 'change 必须是 text 或 table-patch')
}

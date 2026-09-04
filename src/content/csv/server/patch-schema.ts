import { CSV_MAX_PATCH_CHANGES, CSV_MAX_PHYSICAL_LINE_BYTES } from '../../../identity.ts'
import type { CsvCellChange, CsvEntryPatch, CsvHeaderChange } from '../../api.ts'
import { KbError } from '../../../types.ts'

const REVISION_PATTERN = /^[a-f0-9]{64}$/u

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new KbError('csv_patch_invalid', 'CSV 修改数据无效')
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

function requireCsvValue(data: Record<string, unknown>): string {
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

function assertCsvValue(value: string): void {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > CSV_MAX_PHYSICAL_LINE_BYTES) {
    throw new KbError('csv_patch_invalid', '单元格内容过长')
  }
}

/** RPC 收窄与编辑器应用共用的 shape 规则。不检查行列越界。 */
export function assertCsvPatchShape(patch: CsvEntryPatch): void {
  if (!REVISION_PATTERN.test(patch.revision)) throw new KbError('csv_patch_invalid', 'CSV 版本标识无效')
  if (!Array.isArray(patch.headerChanges) || !Array.isArray(patch.cellChanges)) {
    throw new KbError('csv_patch_invalid', 'CSV 修改数据无效')
  }
  if (patch.headerChanges.length + patch.cellChanges.length > CSV_MAX_PATCH_CHANGES) {
    throw new KbError('csv_patch_invalid', `一次最多修改 ${CSV_MAX_PATCH_CHANGES} 个单元格`)
  }
  for (const change of patch.headerChanges) assertCsvValue(change.value)
  for (const change of patch.cellChanges) assertCsvValue(change.value)
}

/** 把不可信的 RPC patch 收窄为类型化的 CSV patch。 */
export function parseCsvEntryPatch(value: unknown): CsvEntryPatch {
  const patch = asRecord(value)
  const revision = patch.revision
  if (typeof revision !== 'string') throw new KbError('csv_patch_invalid', 'CSV 版本标识无效')
  const headerChanges: CsvHeaderChange[] = requireChangeArray(patch, 'headerChanges').map((change) => ({
    column: requireNonNegativeInteger(change, 'column'),
    value: requireCsvValue(change),
  }))
  const cellChanges: CsvCellChange[] = requireChangeArray(patch, 'cellChanges').map((change) => ({
    row: requirePositiveInteger(change, 'row'),
    column: requireNonNegativeInteger(change, 'column'),
    value: requireCsvValue(change),
  }))
  const parsed = { revision, headerChanges, cellChanges }
  assertCsvPatchShape(parsed)
  return parsed
}

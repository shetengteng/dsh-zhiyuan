import { createHash } from 'node:crypto'
import { CSV_EDITOR_PAGE_SIZE, CSV_MAX_IMPORT_BYTES, CSV_MAX_PATCH_CHANGES, CSV_MAX_PHYSICAL_LINE_BYTES } from '../../../identity.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import type { CsvCellChange, CsvEditorPage, CsvEntryPatch, CsvHeaderChange } from '../../api.ts'
import type { EntryCsvPageContext, EntryCsvPatchContext } from '../../host-contract.ts'
import { KbError } from '../../../types.ts'
import { createCsvEditorPage, parseCsvDocument, type CsvDocument } from './csv-document.ts'
import { readValidatedUtf8Csv } from './encoding.ts'
import { writeCsvDocument } from './write.ts'

/** Reads one bounded page for the lightweight CSV editor. */
export async function readCsvEditorPage(context: EntryCsvPageContext): Promise<CsvEditorPage> {
  const { document, revision } = await readCsvDocument(context.absolutePath)
  return createCsvEditorPage(document, positive(context.startRow, '页码'), pageSize(context.pageSize), revision)
}

/** Applies validated cell/header changes to the current CSV revision and atomically writes it. */
export async function writeCsvEditorPatch(context: EntryCsvPatchContext): Promise<void> {
  const { document, revision } = await readCsvDocument(context.absolutePath)
  validatePatch(context.patch, document, revision)
  await writeCsvDocument(context, applyPatch(document, context.patch))
}

async function readCsvDocument(absolutePath: string): Promise<{ document: CsvDocument; revision: string }> {
  const validation = await readValidatedUtf8Csv(absolutePath, CSV_MAX_IMPORT_BYTES)
  if (!validation.ok) throw new KbError(validation.code, validation.message)
  return {
    document: parseCsvDocument(stripUtf8Bom(validation.value.text)),
    revision: createHash('sha256').update(validation.value.bytes).digest('hex'),
  }
}

function positive(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new KbError('csv_patch_invalid', `${label}必须是正整数`)
  return value
}

function pageSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > CSV_EDITOR_PAGE_SIZE) {
    throw new KbError('csv_patch_invalid', `每页最多 ${CSV_EDITOR_PAGE_SIZE} 行`)
  }
  return value
}

function validatePatch(patch: CsvEntryPatch, document: CsvDocument, revision: string): void {
  if (!/^[a-f0-9]{64}$/u.test(patch.revision)) throw new KbError('csv_patch_invalid', 'CSV 版本标识无效')
  if (patch.revision !== revision) throw new KbError('csv_revision_conflict', '文件已被修改，请重新打开后再保存')
  if (!Array.isArray(patch.headerChanges) || !Array.isArray(patch.cellChanges)) {
    throw new KbError('csv_patch_invalid', 'CSV 修改数据无效')
  }
  if (patch.headerChanges.length + patch.cellChanges.length > CSV_MAX_PATCH_CHANGES) {
    throw new KbError('csv_patch_invalid', `一次最多修改 ${CSV_MAX_PATCH_CHANGES} 个单元格`)
  }
  for (const change of patch.headerChanges) validateHeaderChange(change, document.headers.length)
  for (const change of patch.cellChanges) validateCellChange(change, document)
}

function validateHeaderChange(change: CsvHeaderChange, width: number): void {
  validateValue(change.value)
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= width) {
    throw new KbError('csv_patch_invalid', '表头列号无效')
  }
}

function validateCellChange(change: CsvCellChange, document: CsvDocument): void {
  validateValue(change.value)
  if (!Number.isSafeInteger(change.row) || change.row < 1 || change.row > document.records.length) {
    throw new KbError('csv_patch_invalid', 'CSV 行号无效')
  }
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= document.headers.length) {
    throw new KbError('csv_patch_invalid', 'CSV 列号无效')
  }
}

function validateValue(value: string): void {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > CSV_MAX_PHYSICAL_LINE_BYTES) {
    throw new KbError('csv_patch_invalid', '单元格内容过长')
  }
}

function applyPatch(document: CsvDocument, patch: CsvEntryPatch): CsvDocument {
  const next: CsvDocument = {
    header: document.header,
    headers: [...document.headers],
    records: document.records.map((record) => ({ ...record, cells: [...record.cells] })),
  }
  for (const change of patch.headerChanges) next.headers[change.column] = change.value
  for (const change of patch.cellChanges) next.records[change.row - 1]!.cells[change.column] = change.value
  return next
}

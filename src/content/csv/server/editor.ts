import { createHash } from 'node:crypto'
import { CSV_EDITOR_PAGE_SIZE, CSV_MAX_IMPORT_BYTES } from '../../../identity.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import type { CsvCellChange, CsvEditorPage, CsvEntryPatch, CsvHeaderChange } from '../../api.ts'
import type { EntryCsvPageContext, EntryCsvPatchContext } from '../../host-contract.ts'
import { KbError } from '../../../types.ts'
import { createCsvEditorPage, parseCsvDocument, type CsvDocument } from './csv-document.ts'
import { readValidatedUtf8Csv } from './encoding.ts'
import { assertCsvPatchShape } from './patch-schema.ts'
import { writeCsvDocument } from './write.ts'

export async function readCsvDocument(absolutePath: string, maxBytes: number): Promise<{
  document: CsvDocument
  revision: string
  text: string
}> {
  const validation = await readValidatedUtf8Csv(absolutePath, maxBytes)
  if (!validation.ok) throw new KbError(validation.code, validation.message)
  const text = stripUtf8Bom(validation.value.text)
  return {
    document: parseCsvDocument(text),
    revision: createHash('sha256').update(validation.value.bytes).digest('hex'),
    text,
  }
}

/** 读取轻量 CSV 编辑器的一页记录。 */
export async function readCsvEditorPage(context: EntryCsvPageContext): Promise<CsvEditorPage> {
  const { document, revision } = await readCsvDocument(context.absolutePath, CSV_MAX_IMPORT_BYTES)
  return createCsvEditorPage(document, positive(context.startRow, '页码'), pageSize(context.pageSize), revision)
}

/** 将已校验的单元格/表头修改应用到当前 CSV 版本并原子写入。 */
export async function writeCsvEditorPatch(context: EntryCsvPatchContext): Promise<void> {
  const { document, revision } = await readCsvDocument(context.absolutePath, CSV_MAX_IMPORT_BYTES)
  validatePatch(context.patch, document, revision)
  await writeCsvDocument(context, applyPatch(document, context.patch))
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
  assertCsvPatchShape(patch)
  if (patch.revision !== revision) throw new KbError('csv_revision_conflict', '文件已被修改，请重新打开后再保存')
  for (const change of patch.headerChanges) validateHeaderChange(change, document.headers.length)
  for (const change of patch.cellChanges) validateCellChange(change, document)
}

function validateHeaderChange(change: CsvHeaderChange, width: number): void {
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= width) {
    throw new KbError('csv_patch_invalid', '表头列号无效')
  }
}

function validateCellChange(change: CsvCellChange, document: CsvDocument): void {
  if (!Number.isSafeInteger(change.row) || change.row < 1 || change.row > document.records.length) {
    throw new KbError('csv_patch_invalid', 'CSV 行号无效')
  }
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= document.headers.length) {
    throw new KbError('csv_patch_invalid', 'CSV 列号无效')
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

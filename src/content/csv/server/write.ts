import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { CSV_MAX_IMPORT_BYTES } from '../../../identity.ts'
import { encodeUtf8CsvWithBom, stripUtf8Bom } from '../../shared/utf8.ts'
import { assertTablePatchShape } from '../../shared/table-patch.ts'
import type { EntryWriteContext } from '../../host-contract.ts'
import type { TableCellChange, TableHeaderChange, TablePatch } from '../../api.ts'
import { KbError } from '../../../types.ts'
import { readCsvDocument } from './editor.ts'
import { parseCsvDocument, serializeCsvDocument, type CsvDocument } from './csv-document.ts'
import { validateUtf8CsvBytes } from './encoding.ts'

type CsvWriteContext = Pick<EntryWriteContext, 'absolutePath' | 'baseBytesWithoutEntry' | 'maxBaseBytes' | 'maxFileBytes'>

/** CSV 写入唯一入口：整文件替换，或带 revision 校验的稀疏表格修改。 */
export async function writeCsvContent(context: EntryWriteContext): Promise<void> {
  if (context.change.kind === 'text') {
    await writeCsvText(context, context.change.text)
    return
  }
  const { document, revision } = await readCsvDocument(context.absolutePath, CSV_MAX_IMPORT_BYTES)
  validatePatch(context.change.patch, document, revision)
  await writeCsvDocument(context, applyPatch(document, context.change.patch))
}

/** 校验、规范化并原子替换已解析的 CSV 文档。 */
export async function writeCsvDocument(context: CsvWriteContext, document: ReturnType<typeof parseCsvDocument>): Promise<void> {
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes)
  const bytes = encodeUtf8CsvWithBom(serializeCsvDocument(document))
  const validation = validateUtf8CsvBytes(bytes, maxFileBytes)
  if (!validation.ok) throw new KbError(validation.code, validation.message)
  if (context.baseBytesWithoutEntry + bytes.length > context.maxBaseBytes) {
    throw new KbError('quota', '编辑后将超过单库文字上限')
  }
  const entryDirectory = dirname(context.absolutePath)
  const temporaryPath = join(entryDirectory, `.${basename(context.absolutePath)}.${randomUUID()}.tmp`)
  await mkdir(entryDirectory, { recursive: true })
  try {
    await writeFile(temporaryPath, bytes, { flag: 'wx' })
    await rename(temporaryPath, context.absolutePath)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw error
  }
}

async function writeCsvText(context: EntryWriteContext, text: string): Promise<void> {
  const sourceBytes = encodeUtf8CsvWithBom(text)
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes)
  const sourceValidation = validateUtf8CsvBytes(sourceBytes, maxFileBytes)
  if (!sourceValidation.ok) throw new KbError(sourceValidation.code, sourceValidation.message)
  const document = parseCsvDocument(stripUtf8Bom(sourceValidation.value.text))
  await writeCsvDocument(context, document)
}

function validatePatch(patch: TablePatch, document: CsvDocument, revision: string): void {
  assertTablePatchShape(patch)
  if (patch.revision !== revision) throw new KbError('csv_revision_conflict', '文件已被修改，请重新打开后再保存')
  for (const change of patch.headerChanges) validateHeaderChange(change, document.headers.length)
  for (const change of patch.cellChanges) validateCellChange(change, document)
}

function validateHeaderChange(change: TableHeaderChange, width: number): void {
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= width) {
    throw new KbError('csv_patch_invalid', '表头列号无效')
  }
}

function validateCellChange(change: TableCellChange, document: CsvDocument): void {
  if (!Number.isSafeInteger(change.row) || change.row < 1 || change.row > document.records.length) {
    throw new KbError('csv_patch_invalid', 'CSV 行号无效')
  }
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= document.headers.length) {
    throw new KbError('csv_patch_invalid', 'CSV 列号无效')
  }
}

function applyPatch(document: CsvDocument, patch: TablePatch): CsvDocument {
  const next: CsvDocument = {
    header: document.header,
    headers: [...document.headers],
    records: document.records.map((record) => ({ ...record, cells: [...record.cells] })),
  }
  for (const change of patch.headerChanges) next.headers[change.column] = change.value
  for (const change of patch.cellChanges) next.records[change.row - 1]!.cells[change.column] = change.value
  return next
}

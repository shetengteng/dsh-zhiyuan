import { createHash } from 'node:crypto'
import { CSV_MAX_IMPORT_BYTES, TABLE_EDITOR_PAGE_SIZE } from '../../../identity.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import type { TableEditorPage } from '../../api.ts'
import type { EntryPageContext } from '../../host-contract.ts'
import { KbError } from '../../../types.ts'
import { createCsvEditorPage, parseCsvDocument, type CsvDocument } from './csv-document.ts'
import { readValidatedUtf8Csv } from './encoding.ts'

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

/** 读取轻量表格编辑器的一页记录。 */
export async function readCsvPage(context: EntryPageContext): Promise<TableEditorPage> {
  const { document, revision } = await readCsvDocument(context.absolutePath, CSV_MAX_IMPORT_BYTES)
  return createCsvEditorPage(document, positive(context.startRow, '页码'), pageSize(context.pageSize), revision)
}

function positive(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new KbError('csv_patch_invalid', `${label}必须是正整数`)
  return value
}

function pageSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > TABLE_EDITOR_PAGE_SIZE) {
    throw new KbError('csv_patch_invalid', `每页最多 ${TABLE_EDITOR_PAGE_SIZE} 行`)
  }
  return value
}

import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { CSV_MAX_IMPORT_BYTES } from '../../../identity.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import type { EntryWriteContext } from '../../host-contract.ts'
import { KbError } from '../../../types.ts'
import { parseCsvDocument, serializeCsvDocument } from './csv-document.ts'
import { validateUtf8CsvBytes } from './encoding.ts'

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf])

/** Writes edited tables as the defined UTF-8-BOM, comma-delimited CSV output. */
export async function writeCsvEntry(context: EntryWriteContext): Promise<void> {
  const sourceBytes = Buffer.concat([UTF8_BOM, Buffer.from(stripUtf8Bom(context.text), 'utf8')])
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes)
  const sourceValidation = validateUtf8CsvBytes(sourceBytes, maxFileBytes)
  if (!sourceValidation.ok) throw new KbError(sourceValidation.code, sourceValidation.message)
  const document = parseCsvDocument(stripUtf8Bom(sourceValidation.value.text))
  const bytes = Buffer.concat([UTF8_BOM, Buffer.from(serializeCsvDocument(document), 'utf8')])
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

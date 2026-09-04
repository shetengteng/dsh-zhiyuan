import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { CSV_MAX_IMPORT_BYTES } from '../../../identity.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import type { EntryCsvPatchContext, EntryWriteContext } from '../../host-contract.ts'
import { KbError } from '../../../types.ts'
import { parseCsvDocument, serializeCsvDocument } from './csv-document.ts'
import { validateUtf8CsvBytes } from './encoding.ts'

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf])

type CsvWriteContext = Pick<EntryWriteContext | EntryCsvPatchContext, 'absolutePath' | 'baseBytesWithoutEntry' | 'maxBaseBytes' | 'maxFileBytes'>

/** 整文件替换 CSV。与 writeCsvPatch 不同，本路径不校验 revision，供命令和测试使用。 */
export async function writeCsvEntry(context: EntryWriteContext): Promise<void> {
  const sourceBytes = Buffer.concat([UTF8_BOM, Buffer.from(stripUtf8Bom(context.text), 'utf8')])
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes)
  const sourceValidation = validateUtf8CsvBytes(sourceBytes, maxFileBytes)
  if (!sourceValidation.ok) throw new KbError(sourceValidation.code, sourceValidation.message)
  const document = parseCsvDocument(stripUtf8Bom(sourceValidation.value.text))
  await writeCsvDocument(context, document)
}

/** 校验、规范化并原子替换已解析的 CSV 文档。 */
export async function writeCsvDocument(context: CsvWriteContext, document: ReturnType<typeof parseCsvDocument>): Promise<void> {
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes)
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

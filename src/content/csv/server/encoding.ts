import { open } from 'node:fs/promises'
import { CSV_MAX_PHYSICAL_LINE_BYTES } from '../../../identity.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'

export type ValidatedCsv = {
  bytes: Buffer
  text: string
  byteLength: number
}

export type CsvValidation =
  | { ok: true; value: ValidatedCsv }
  | {
    ok: false
    code: 'csv_encoding_invalid' | 'csv_control_character' | 'csv_line_too_long' | 'file_too_large'
    message: string
  }

const READ_CHUNK_BYTES = 64 * 1024
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/u

export function isCsvPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.csv')
}

export { stripUtf8Bom }

async function readBoundedBuffer(sourcePath: string, maxBytes: number): Promise<Buffer | null> {
  const limit = Math.floor(maxBytes)
  if (!Number.isSafeInteger(limit) || limit < 0) return null
  const handle = await open(sourcePath, 'r')
  try {
    const chunks: Buffer[] = []
    let total = 0
    while (total <= limit) {
      const remaining = limit + 1 - total
      const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, remaining))
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null)
      if (!bytesRead) break
      chunks.push(chunk.subarray(0, bytesRead))
      total += bytesRead
    }
    if (total > limit) return null
    return Buffer.concat(chunks, total)
  } finally {
    await handle.close()
  }
}

function hasInvalidControlCharacter(text: string): boolean {
  return CONTROL_CHARACTER_PATTERN.test(text)
}

function lineContentBytes(bytes: Buffer, start: number, end: number, lineNumber: number): number {
  let length = end - start
  if (length > 0 && bytes[end - 1] === 0x0d) length -= 1
  if (lineNumber === 1 && bytes.subarray(start, Math.min(end, start + 3)).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    length -= 3
  }
  return Math.max(0, length)
}

function hasOverlongPhysicalLine(bytes: Buffer): boolean {
  let lineStart = 0
  let lineNumber = 1
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0x0a) continue
    if (lineContentBytes(bytes, lineStart, index, lineNumber) > CSV_MAX_PHYSICAL_LINE_BYTES) return true
    lineStart = index + 1
    lineNumber += 1
  }
  return lineContentBytes(bytes, lineStart, bytes.length, lineNumber) > CSV_MAX_PHYSICAL_LINE_BYTES
}

export async function readValidatedUtf8Csv(sourcePath: string, maxBytes: number): Promise<CsvValidation> {
  const bytes = await readBoundedBuffer(sourcePath, maxBytes)
  if (!bytes) {
    return { ok: false, code: 'file_too_large', message: '文件超过大小上限，未导入' }
  }

  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, code: 'csv_encoding_invalid', message: 'CSV 不是有效的 UTF-8 文件' }
  }
  if (hasInvalidControlCharacter(text)) {
    return { ok: false, code: 'csv_control_character', message: 'CSV 含不允许的控制字符' }
  }
  if (hasOverlongPhysicalLine(bytes)) {
    return { ok: false, code: 'csv_line_too_long', message: `CSV 单行不能超过 ${CSV_MAX_PHYSICAL_LINE_BYTES} 字节` }
  }
  return { ok: true, value: { bytes, text, byteLength: bytes.length } }
}

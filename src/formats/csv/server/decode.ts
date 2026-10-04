import { stripUtf8Bom } from '../../shared/utf8.ts'

export type CsvDecodeEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030'

export type CsvDecodeResult =
  | { ok: true; text: string; encoding: CsvDecodeEncoding; warnings: string[] }
  | { ok: false; code: 'csv_encoding_invalid' | 'encoding_unsupported'; message: string }

let gb18030Available: boolean | undefined

function isGb18030Available(): boolean {
  if (gb18030Available !== undefined) return gb18030Available
  try {
    void new TextDecoder('gb18030', { fatal: true })
    gb18030Available = true
  } catch {
    gb18030Available = false
  }
  return gb18030Available
}

function decodeWith(encoding: CsvDecodeEncoding, bytes: Buffer): string | undefined {
  try {
    return stripUtf8Bom(new TextDecoder(encoding, { fatal: true }).decode(bytes))
  } catch {
    return undefined
  }
}

function startsWith(bytes: Buffer, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value)
}

/** 按 BOM → UTF-8 → 假定 GB18030 解码 CSV 源字节，不改格子。 */
export function decodeCsvBytes(bytes: Buffer): CsvDecodeResult {
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    const text = decodeWith('utf-8', bytes)
    if (text === undefined) return { ok: false, code: 'csv_encoding_invalid', message: 'CSV 不是有效的 UTF-8 文件' }
    return { ok: true, text, encoding: 'utf-8', warnings: [] }
  }
  if (startsWith(bytes, [0xff, 0xfe])) {
    const text = decodeWith('utf-16le', bytes)
    if (text === undefined) return { ok: false, code: 'csv_encoding_invalid', message: 'CSV 不是有效的 UTF-16 文件' }
    return { ok: true, text, encoding: 'utf-16le', warnings: [] }
  }
  if (startsWith(bytes, [0xfe, 0xff])) {
    const text = decodeWith('utf-16be', bytes)
    if (text === undefined) return { ok: false, code: 'csv_encoding_invalid', message: 'CSV 不是有效的 UTF-16 文件' }
    return { ok: true, text, encoding: 'utf-16be', warnings: [] }
  }

  const utf8 = decodeWith('utf-8', bytes)
  if (utf8 !== undefined) return { ok: true, text: utf8, encoding: 'utf-8', warnings: [] }
  if (!isGb18030Available()) {
    return { ok: false, code: 'encoding_unsupported', message: '当前运行环境无法解码 GB18030 CSV' }
  }
  const gb18030 = decodeWith('gb18030', bytes)
  if (gb18030 === undefined) {
    return { ok: false, code: 'csv_encoding_invalid', message: '无法按 UTF-8 / UTF-16 / GB18030 解码该 CSV' }
  }
  return {
    ok: true,
    text: gb18030,
    encoding: 'gb18030',
    warnings: ['encoding_assumed_gb18030：已按 GB18030 解码，并写成 UTF-8'],
  }
}

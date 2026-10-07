import { stripUtf8Bom } from '../../shared/utf8.ts'

/**
 * HTML 源字节解码：BOM → UTF-8 严格解码 → meta charset 声明 → GB18030 兜底。
 * UTF-8 放在声明之前：GB18030 几乎接受任何字节序列，声明错了也不至于把
 * UTF-8 页面转成乱码；声明只用于承接 big5、shift_jis 等 UTF-8 解不开的编码。
 */

export type HtmlDecodeResult =
  | { ok: true; text: string; encoding: string; warnings: string[] }
  | { ok: false; message: string }

const CHARSET_PATTERN = /charset\s*=\s*["']?\s*([a-zA-Z0-9_.:-]+)/i

/** meta 声明按规范必须出现在前 1024 字节；标签字节在常见编码下都是 ASCII，latin1 嗅探即可。 */
const SNIFF_BYTES = 2048

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

function decodeWith(label: string, bytes: Buffer): string | undefined {
  try {
    return stripUtf8Bom(new TextDecoder(label, { fatal: true }).decode(bytes))
  } catch {
    return undefined
  }
}

function startsWith(bytes: Buffer, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value)
}

function declaredCharset(bytes: Buffer): string | undefined {
  const head = bytes.subarray(0, SNIFF_BYTES).toString('latin1')
  const match = CHARSET_PATTERN.exec(head)
  return match ? match[1].toLowerCase() : undefined
}

/** 按 BOM → UTF-8 → meta 声明 → GB18030 解码 HTML 源字节。 */
export function decodeHtmlBytes(bytes: Buffer): HtmlDecodeResult {
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    const text = decodeWith('utf-8', bytes)
    if (text === undefined) return { ok: false, message: 'HTML 不是有效的 UTF-8 文件' }
    return { ok: true, text, encoding: 'utf-8', warnings: [] }
  }
  if (startsWith(bytes, [0xff, 0xfe])) {
    const text = decodeWith('utf-16le', bytes)
    if (text === undefined) return { ok: false, message: 'HTML 不是有效的 UTF-16 文件' }
    return { ok: true, text, encoding: 'utf-16le', warnings: [] }
  }
  if (startsWith(bytes, [0xfe, 0xff])) {
    const text = decodeWith('utf-16be', bytes)
    if (text === undefined) return { ok: false, message: 'HTML 不是有效的 UTF-16 文件' }
    return { ok: true, text, encoding: 'utf-16be', warnings: [] }
  }

  const utf8 = decodeWith('utf-8', bytes)
  if (utf8 !== undefined) return { ok: true, text: utf8, encoding: 'utf-8', warnings: [] }

  const declared = declaredCharset(bytes)
  if (declared && declared !== 'utf-8' && declared !== 'utf8') {
    // gb2312 / gbk 由 gb18030 承接（向下兼容）
    const label = declared === 'gb2312' || declared === 'gbk' ? 'gb18030' : declared
    const text = decodeWith(label, bytes)
    if (text !== undefined) return { ok: true, text, encoding: label, warnings: [] }
  }

  if (!isGb18030Available()) {
    return { ok: false, message: '当前运行环境无法解码 GB18030 编码的 HTML' }
  }
  const gb18030 = decodeWith('gb18030', bytes)
  if (gb18030 === undefined) {
    return { ok: false, message: '无法按 UTF-8 / UTF-16 / GB18030 解码该 HTML' }
  }
  return {
    ok: true,
    text: gb18030,
    encoding: 'gb18030',
    warnings: ['已按 GB18030 解码，并转成 UTF-8'],
  }
}

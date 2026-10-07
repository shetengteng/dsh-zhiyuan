import { CJK_RADICAL_TO_IDEOGRAPH } from './cjk-radicals.ts'

/**
 * CJK 部首区字符归一：把 U+2E80–U+2FDF 的部首字替换为对应统一表意字。
 * Chrome 等导出器的 PDF ToUnicode 会把部分汉字映射到部首区（文→⽂、长→⻓），
 * 不归一则检索搜「文档」命不中「⽂档」。表中无对应的字符（不成字部首）原样保留。
 */
const RADICAL_PATTERN = /[\u2e80-\u2fdf]/

export function normalizeRadicals(text: string): string {
  if (!RADICAL_PATTERN.test(text)) return text
  let result = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    const unified = code >= 0x2e80 && code <= 0x2fdf ? CJK_RADICAL_TO_IDEOGRAPH.get(code) : undefined
    result += unified === undefined ? ch : String.fromCodePoint(unified)
  }
  return result
}

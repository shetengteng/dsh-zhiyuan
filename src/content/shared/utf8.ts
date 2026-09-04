export const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf])

export function stripUtf8Bom(text: string): string {
  return text.startsWith('\uFEFF') ? text.slice(1) : text
}

/** CSV 换行统一成 LF，供导入与编辑写出共用。 */
export function normalizeCsvNewlines(text: string): string {
  return text.replace(/\r\n|\r/g, '\n')
}

/** 去掉已有 BOM 后写成 UTF-8+BOM。 */
export function encodeUtf8CsvWithBom(text: string): Buffer {
  return Buffer.concat([UTF8_BOM, Buffer.from(stripUtf8Bom(text), 'utf8')])
}

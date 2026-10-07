/**
 * PDF 文本行重组：纯函数，无 IO、不 import 解析库。
 * PDF 没有行与段落，只有带坐标的字元簇；策略是「宁可碎，不可错」：
 * 按 y 聚类成行、按 x 排序拼接、行间独立分段，不做标题推断与段落合并。
 */

/** 从 PDF.js textContent item 收窄出的布局所需字段子集。 */
export type PdfTextItem = {
  str: string
  x: number
  y: number
  width: number
  height: number
  hasEol: boolean
}

function isCjkCode(code: number): boolean {
  return (
    (code >= 0x2e80 && code <= 0x9fff) || // CJK 部首、康熙部首、假名、CJK 统一表意
    (code >= 0x3400 && code <= 0x4dbf) || // CJK 扩展 A
    (code >= 0xf900 && code <= 0xfaff) || // CJK 兼容表意
    (code >= 0xff00 && code <= 0xffef) // 全角形式
  )
}

function isCjkText(text: string): boolean {
  const code = text.codePointAt(0)
  return code !== undefined && isCjkCode(code)
}

type TextRow = { baseY: number; maxHeight: number; items: PdfTextItem[] }

/** 按页内 y 坐标聚类成几何行：y 从大到小（页顶在前），同带并入当前行。 */
function collectRows(items: readonly PdfTextItem[]): TextRow[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: TextRow[] = []
  for (const item of sorted) {
    const row = rows[rows.length - 1]
    const tolerance = row ? Math.max(2, row.maxHeight * 0.5) : Number.POSITIVE_INFINITY
    if (row && Math.abs(item.y - row.baseY) <= tolerance) {
      row.items.push(item)
      if (item.height > row.maxHeight) row.maxHeight = item.height
    } else {
      rows.push({ baseY: item.y, maxHeight: item.height, items: [item] })
    }
  }
  return rows
}

/** 行内按 x 排序拼接：CJK 邻接直拼；拉丁之间间距超过阈值补一个空格。 */
function joinRowItems(items: readonly PdfTextItem[]): string {
  const ordered = [...items].sort((a, b) => a.x - b.x)
  let text = ''
  let prevEnd = 0
  let prevHeight = 0
  let prevTailLatin = false
  for (const item of ordered) {
    const piece = item.str.replace(/\s+/g, ' ').trim()
    if (!piece) continue
    if (text && prevTailLatin && !isCjkText(piece)) {
      const gap = item.x - prevEnd
      const gapRatio = prevHeight > 0 ? gap / prevHeight : 0
      if (gapRatio > 0.2) text += ' '
    }
    text += piece
    prevEnd = item.x + item.width
    if (item.height > 0) prevHeight = item.height
    const tailCode = piece.codePointAt(piece.length - 1) ?? 0
    prevTailLatin = !isCjkCode(tailCode)
  }
  return text
}

/** 单页 items → markdown 文本；行即段落（双换行分隔），没有内容的页返回空串。 */
export function layoutPdfPage(items: readonly PdfTextItem[]): string {
  const usable = items.filter((item) => item.str.trim().length > 0)
  if (!usable.length) return ''
  const lines = collectRows(usable)
    .map((row) => joinRowItems(row.items))
    .filter((line) => line.length > 0)
  return lines.join('\n\n')
}

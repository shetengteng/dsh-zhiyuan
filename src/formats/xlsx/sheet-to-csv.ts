import * as XLSX from '@e965/xlsx'
import { KbError } from '../../model/error/kb-error.ts'
import { encodeUtf8CsvWithBom } from '../shared/utf8.ts'
import type { XlsxConvertRequest } from './xlsx-request.ts'

// 本文件是 XLSX 库的唯一调用点：结构校验 + sheet_to_csv，不改格子、不写库。
// 只允许 worker.ts import 本模块，保证 XLSX 库不进入 Host 主 bundle。

export type XlsxSheetOutput = { outputName: string; bytes: Buffer }

export type XlsxConversion = {
  outputs: XlsxSheetOutput[]
  warnings: string[]
}

function fail(code: 'xlsx_invalid' | 'file_too_large', message: string): never {
  throw new KbError(code, message)
}

function sheetHidden(workbook: XLSX.WorkBook, index: number): boolean {
  const hidden = workbook.Workbook?.Sheets?.[index]?.Hidden
  return hidden === 1 || hidden === 2
}

/** sheet 名映射成保守文件名片段；清洗后为空则回退 sheet-<序号>。 */
function sheetNameFragment(rawName: string, index: number): string {
  const cleaned = rawName.replace(/[/\\:*?"<>|\u0000-\u001f]/g, '').trim()
  return cleaned || `sheet-${index + 1}`
}

/** 声明范围必须落在硬上限内：以 !ref 原始声明为准，不因隐藏行列放宽。 */
function assertDeclaredRangeWithinLimits(worksheet: XLSX.WorkSheet, rawName: string, request: XlsxConvertRequest): XLSX.Range {
  const reference = worksheet['!ref']
  if (typeof reference !== 'string' || !reference) {
    fail('xlsx_invalid', `工作表「${rawName}」缺少声明范围`)
  }
  const range = XLSX.utils.decode_range(reference)
  const rows = range.e.r - range.s.r + 1
  const cols = range.e.c - range.s.c + 1
  if (rows > request.maxSheetRows || cols > request.maxSheetCols) {
    fail('xlsx_invalid', `工作表「${rawName}」声明范围 ${rows} 行 × ${cols} 列超过上限（${request.maxSheetRows} 行 × ${request.maxSheetCols} 列）`)
  }
  return range
}

/**
 * 带 f 的可导出单元格必须有缓存计算结果，否则整份源失败。
 * SheetJS 0.20.3 对缺失缓存的公式产出桩单元格 { t: 'z', f, v: 0 }：
 * v 总是被物化，不能按「没有 v 自有属性」判定；也不能用 falsy 检查——
 * 缓存值恰为 0 或空字符串的公式是 { t: 'n', v: 0, w }，必须放行。
 */
function assertFormulaCachePresent(worksheet: XLSX.WorkSheet, range: XLSX.Range, rawName: string): void {
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell: unknown = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
      if (!cell || typeof cell !== 'object') continue
      if (Object.prototype.hasOwnProperty.call(cell, 'f') && (cell as { t?: unknown }).t === 'z') {
        fail('xlsx_invalid', `工作表「${rawName}」含有未保存计算结果的公式，请在 Excel 中重新计算并保存后再导入`)
      }
    }
  }
}

/** 去掉分隔符与引号后没有任何内容视为空表（全空 sheet / 仅空格子）。 */
function isEmptyCsv(text: string): boolean {
  return text.replace(/[",\n]/g, '').length === 0
}

/** 读取工作簿字节并转出若干 UTF-8+BOM 逗号 CSV；隐藏 / 空 sheet 跳过并记 warning。 */
export function convertXlsxToCsvOutputs(sourceBytes: Buffer, request: XlsxConvertRequest): XlsxConversion {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(sourceBytes, { type: 'buffer', cellDates: false, cellStyles: true })
  } catch {
    fail('xlsx_invalid', '工作簿无法解析，文件可能已损坏、被加密或不是有效的 .xlsx 文件')
  }
  if (workbook.SheetNames.length > request.maxSheets) {
    fail('xlsx_invalid', `工作表数量超过上限 ${request.maxSheets}，整份工作簿不导入`)
  }

  const warnings: string[] = []
  const drafts: { fragment: string; bytes: Buffer }[] = []
  workbook.SheetNames.forEach((rawName, index) => {
    const worksheet = workbook.Sheets[rawName]
    if (!worksheet) {
      warnings.push(`已跳过空工作表：${rawName}`)
      return
    }
    if (sheetHidden(workbook, index)) {
      warnings.push(`已跳过隐藏工作表：${rawName}`)
      return
    }
    if (typeof worksheet['!ref'] !== 'string') {
      warnings.push(`已跳过空工作表：${rawName}`)
      return
    }
    const range = assertDeclaredRangeWithinLimits(worksheet, rawName, request)
    assertFormulaCachePresent(worksheet, range, rawName)
    const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n', blankrows: false, skipHidden: true })
    if (isEmptyCsv(csv)) {
      warnings.push(`已跳过空工作表：${rawName}`)
      return
    }
    const bytes = encodeUtf8CsvWithBom(csv)
    if (bytes.length > request.maxOutputBytes) {
      fail('file_too_large', `转换产物超过 ${request.maxOutputBytes} 字节`)
    }
    drafts.push({ fragment: sheetNameFragment(rawName, index), bytes })
  })

  // 单个可导出 sheet 用源名；多个时才追加 sheet 名片段
  const outputs = drafts.map((draft) => ({
    outputName: drafts.length === 1
      ? `${request.outputStem}.csv`
      : `${request.outputStem}-${draft.fragment}.csv`,
    bytes: draft.bytes,
  }))
  return { outputs, warnings }
}

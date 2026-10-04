import { EntryFormat, SourceFormat } from '../../model/content-contract.ts'
import { CSV_MAX_IMPORT_BYTES } from '../../model/csv-limits.ts'
import { XLSX_MAX_SHEET_COLS, XLSX_MAX_SHEET_ROWS, XLSX_MAX_SHEETS } from '../../model/xlsx-limits.ts'
import { runIsolatedConversion, type ConvertWorkerSpec } from '../../platform/convert-worker.ts'
import type { ContentFormatModule, PrepareImportContext, SourceFormatHandler } from '../host-contract.ts'
import type { PreparedImport } from '../shared/ingest-output.ts'
import type { XlsxConvertRequest } from './xlsx-request.ts'

// XLSX 源格式注册面：转换在隔离子进程完成，产物是若干 CSV 条目，落库即可表格编辑。

// 内部硬编码 descriptor：产物名与源码入口都不来自用户输入
const workerSpec: ConvertWorkerSpec = {
  builtFileName: 'convert-xlsx-worker.js',
  sourceUrl: new URL('./worker.ts', import.meta.url),
}

function outputStemOf(sourceName: string): string {
  return sourceName.replace(/\.xlsx$/i, '') || 'sheet'
}

export async function prepareXlsxImport(context: PrepareImportContext): Promise<PreparedImport> {
  const request: XlsxConvertRequest = {
    kind: 'convert-xlsx',
    sourcePath: context.sourcePath,
    outputStem: outputStemOf(context.sourceName),
    maxSourceBytes: context.maxFileBytes,
    // 产物是 CSV 条目：单文件上限与库内 CSV 一致，保证检索和编辑读得回来
    maxOutputBytes: Math.min(context.maxFileBytes, CSV_MAX_IMPORT_BYTES),
    maxSheets: XLSX_MAX_SHEETS,
    maxSheetRows: XLSX_MAX_SHEET_ROWS,
    maxSheetCols: XLSX_MAX_SHEET_COLS,
  }
  const conversion = await runIsolatedConversion(workerSpec, request)
  if (!conversion.outputs.length) {
    // 所有 sheet 均被隐藏或为空：源级按设计跳过，不是成功的零输出
    return { kind: 'skipped', reason: '工作簿没有可导入的工作表', warnings: conversion.warnings }
  }
  return {
    kind: 'entries',
    entries: conversion.outputs.map((output) => ({
      format: EntryFormat.Csv,
      outputName: output.outputName,
      byteLength: output.byteLength,
      digest: output.digest,
      content: { kind: 'bytes', bytes: Buffer.from(output.bytes) },
      warnings: conversion.warnings.length ? conversion.warnings : undefined,
    })),
  }
}

const xlsxSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Xlsx,
  sourceExtensions: ['.xlsx'],
  prepareImport: prepareXlsxImport,
}

/** XLSX 在 Host registry 上的唯一注册面；产物是 CSV 条目，无 entryHandler。 */
export const xlsxContentFormat: ContentFormatModule = {
  sourceHandlers: [xlsxSourceHandler],
  entryHandlers: [],
}

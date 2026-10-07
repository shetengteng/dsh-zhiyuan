import { EntryFormat, SourceFormat } from '../../model/content-contract.ts'
import { KbError } from '../../model/error/kb-error.ts'
import { runIsolatedConversion, type ConvertWorkerSpec } from '../../platform/convert-worker.ts'
import type { ContentFormatModule, PrepareImportContext, SourceFormatHandler } from '../host-contract.ts'
import type { PreparedImport } from '../shared/ingest-output.ts'
import type { PdfConvertRequest } from './pdf-request.ts'

/** PDF 源格式注册面：文本层提取在隔离子进程完成，产物恒为 1 个 markdown 条目。 */

// 内部硬编码 descriptor：产物名与源码入口都不来自用户输入
const workerSpec: ConvertWorkerSpec = {
  builtFileName: 'convert-pdf-worker.js',
  sourceUrl: new URL('./worker.ts', import.meta.url),
}

function pdfOutputName(sourceName: string): string {
  return `${sourceName.replace(/\.pdf$/i, '')}.md`
}

export async function preparePdfImport(context: PrepareImportContext): Promise<PreparedImport> {
  const outputName = pdfOutputName(context.sourceName)
  const request: PdfConvertRequest = {
    kind: 'convert-pdf',
    sourcePath: context.sourcePath,
    outputName,
    maxSourceBytes: context.maxFileBytes,
    maxOutputBytes: context.maxFileBytes,
  }
  const conversion = await runIsolatedConversion(workerSpec, request)
  const output = conversion.outputs[0]
  if (!output || output.outputName !== outputName) {
    throw new KbError('io_failed', 'PDF 转换没有产出')
  }
  return {
    kind: 'entries',
    entries: [{
      format: EntryFormat.Markdown,
      outputName,
      byteLength: output.byteLength,
      digest: output.digest,
      content: { kind: 'bytes', bytes: Buffer.from(output.bytes) },
      warnings: conversion.warnings.length ? conversion.warnings : undefined,
    }],
  }
}

const pdfSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Pdf,
  sourceExtensions: ['.pdf'],
  prepareImport: preparePdfImport,
}

/** PDF 在 Host registry 上的唯一注册面；产物是 markdown 条目，无 entryHandler。 */
export const pdfContentFormat: ContentFormatModule = {
  sourceHandlers: [pdfSourceHandler],
  entryHandlers: [],
}

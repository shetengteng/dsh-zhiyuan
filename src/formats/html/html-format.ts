import { EntryFormat, SourceFormat } from '../../model/content-contract.ts'
import { KbError } from '../../model/error/kb-error.ts'
import { runIsolatedConversion, type ConvertWorkerSpec } from '../../platform/convert-worker.ts'
import type { ContentFormatModule, PrepareImportContext, SourceFormatHandler } from '../host-contract.ts'
import type { PreparedImport } from '../shared/ingest-output.ts'
import type { HtmlConvertRequest } from './html-request.ts'

/** HTML 源格式注册面：转换在隔离子进程完成，产物恒为 1 个 markdown 条目。 */

// 内部硬编码 descriptor：产物名与源码入口都不来自用户输入
const workerSpec: ConvertWorkerSpec = {
  builtFileName: 'convert-html-worker.js',
  sourceUrl: new URL('./worker.ts', import.meta.url),
}

function htmlOutputName(sourceName: string): string {
  return `${sourceName.replace(/\.html?$/i, '')}.md`
}

export async function prepareHtmlImport(context: PrepareImportContext): Promise<PreparedImport> {
  const outputName = htmlOutputName(context.sourceName)
  const request: HtmlConvertRequest = {
    kind: 'convert-html',
    sourcePath: context.sourcePath,
    outputName,
    maxSourceBytes: context.maxFileBytes,
    maxOutputBytes: context.maxFileBytes,
  }
  const conversion = await runIsolatedConversion(workerSpec, request)
  const output = conversion.outputs[0]
  if (!output || output.outputName !== outputName) {
    throw new KbError('io_failed', 'HTML 转换没有产出')
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

const htmlSourceHandler: SourceFormatHandler = {
  sourceFormat: SourceFormat.Html,
  sourceExtensions: ['.html', '.htm'],
  prepareImport: prepareHtmlImport,
}

/** HTML 在 Host registry 上的唯一注册面；产物是 markdown 条目，无 entryHandler。 */
export const htmlContentFormat: ContentFormatModule = {
  sourceHandlers: [htmlSourceHandler],
  entryHandlers: [],
}

import { stat } from 'node:fs/promises'
import { EntryFormat } from '../../api.ts'
import { sha256File } from '../../shared/file-hash.ts'
import { KbError } from '../../../types.ts'
import type { PrepareImportContext } from '../../host-contract.ts'
import type { PreparedEntry } from '../../shared/ingest-output.ts'

export async function prepareMarkdownImport(context: PrepareImportContext): Promise<PreparedEntry> {
  const byteLength = (await stat(context.sourcePath)).size
  if (byteLength > context.maxFileBytes) {
    throw new KbError('file_too_large', `单文件超过 ${context.maxFileBytes} 字节`)
  }
  return {
    format: EntryFormat.Markdown,
    outputName: context.sourceName,
    byteLength,
    digest: await sha256File(context.sourcePath),
    content: { kind: 'source-file', sourcePath: context.sourcePath },
  }
}

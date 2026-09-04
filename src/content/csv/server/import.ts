import { createHash } from 'node:crypto'
import { CSV_MAX_IMPORT_BYTES } from '../../../identity.ts'
import { EntryFormat } from '../../api.ts'
import { KbError } from '../../../types.ts'
import { readNormalizedImportCsv } from './encoding.ts'
import type { PrepareImportContext } from '../../host-contract.ts'
import type { PreparedEntry } from '../../shared/ingest-output.ts'

export async function prepareCsvImport(context: PrepareImportContext): Promise<PreparedEntry> {
  const validation = await readNormalizedImportCsv(context.sourcePath, Math.min(context.maxFileBytes, CSV_MAX_IMPORT_BYTES))
  if (!validation.ok) throw new KbError(validation.code, validation.message)
  return {
    format: EntryFormat.Csv,
    outputName: context.sourceName,
    byteLength: validation.value.byteLength,
    digest: createHash('sha256').update(validation.value.bytes).digest('hex'),
    content: { kind: 'bytes', bytes: validation.value.bytes },
    ...(validation.warnings?.length ? { warnings: validation.warnings } : {}),
  }
}

import { CSV_PREVIEW_MAX_BYTES } from '../../../identity.ts'
import { createPhysicalLineSearchDocument, type SearchDocument } from '../../shared/search-document.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import { KbError } from '../../../types.ts'
import { readValidatedUtf8Csv } from './encoding.ts'
import type { EntryPathContext } from '../../host-contract.ts'

export async function readCsvForSearch(context: EntryPathContext): Promise<SearchDocument> {
  const validation = await readValidatedUtf8Csv(context.absolutePath, CSV_PREVIEW_MAX_BYTES)
  if (!validation.ok) throw new KbError(validation.code, validation.message)
  return createPhysicalLineSearchDocument(validation.value.bytes, stripUtf8Bom(validation.value.text))
}

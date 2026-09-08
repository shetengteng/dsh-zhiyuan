import { CSV_PREVIEW_MAX_BYTES } from '../../../model/constants.ts'
import { createCsvSearchDocument } from './search-excerpt.ts'
import type { SearchDocument } from '../../shared/search-document.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import { KbError } from '../../../model/types.ts'
import { readValidatedUtf8Csv } from './encoding.ts'
import type { EntryPathContext } from '../../host-contract.ts'

export async function readCsvForSearch(context: EntryPathContext): Promise<SearchDocument> {
  const validation = await readValidatedUtf8Csv(context.absolutePath, CSV_PREVIEW_MAX_BYTES)
  if (!validation.ok) throw new KbError(validation.code, validation.message)
  return createCsvSearchDocument(validation.value.bytes, stripUtf8Bom(validation.value.text))
}

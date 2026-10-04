import { readFile } from 'node:fs/promises'
import { createPhysicalLineSearchDocument, type SearchDocument } from '../../shared/search-document.ts'
import { stripUtf8Bom } from '../../shared/utf8.ts'
import type { EntryPathContext } from '../../host-contract.ts'

export async function readMarkdownForSearch(context: EntryPathContext): Promise<SearchDocument> {
  const bytes = await readFile(context.absolutePath)
  return createPhysicalLineSearchDocument(bytes, stripUtf8Bom(bytes.toString('utf8')))
}

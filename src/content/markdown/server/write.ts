import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { EntryWriteContext } from '../../host-contract.ts'

export async function writeMarkdownEntry(context: EntryWriteContext): Promise<void> {
  await mkdir(dirname(context.absolutePath), { recursive: true })
  await writeFile(context.absolutePath, context.text, 'utf8')
}

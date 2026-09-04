import { randomUUID } from 'node:crypto'
import { copyFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import type { EntryFormat } from '../api.ts'
import { sha256File } from './file-hash.ts'

export type PreparedContent =
  | { kind: 'source-file'; sourcePath: string }
  | { kind: 'bytes'; bytes: Buffer }

export type PreparedEntry = {
  format: EntryFormat
  outputName: string
  byteLength: number
  digest: string
  content: PreparedContent
  warnings?: string[]
}

export async function writePreparedEntry(destinationPath: string, entry: PreparedEntry): Promise<number> {
  const temporaryPath = `${destinationPath}.${randomUUID()}.tmp`
  try {
    if (entry.content.kind === 'bytes') {
      await writeFile(temporaryPath, entry.content.bytes, { flag: 'wx' })
    } else {
      await copyFile(entry.content.sourcePath, temporaryPath, 0)
    }
    const writtenBytes = (await stat(temporaryPath)).size
    const writtenDigest = await sha256File(temporaryPath)
    if (writtenBytes !== entry.byteLength || writtenDigest !== entry.digest) {
      throw new Error('导入期间源文件已变化')
    }
    await rename(temporaryPath, destinationPath)
    return writtenBytes
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw error
  }
}

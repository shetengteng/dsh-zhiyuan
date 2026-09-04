import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildIngestInput, ingest } from './ingest.ts'
import type { IngestResult } from './types.ts'
import { KbError } from './types.ts'

export function sanitizeDroppedFileName(name: string): string {
  const base = name.trim().split(/[\\/]/).pop() ?? ''
  if (!base || base === '.' || base === '..' || base.includes('\0')) {
    throw new KbError('invalid_field', '拖入文件名无效')
  }
  return base
}

/** 浏览器拖入往往只有 File 没有本机路径，先落到临时文件再走现有导入。 */
export async function ingestDroppedBytes(dataRoot: string, input: {
  baseId: string
  destCategory: string
  fileName: string
  bytes: Buffer
  preserveTree?: boolean
  createMissing?: boolean
}): Promise<IngestResult> {
  const fileName = sanitizeDroppedFileName(input.fileName)
  if (input.bytes.length === 0) throw new KbError('invalid_field', '拖入文件是空的')
  const tempDir = await mkdtemp(join(tmpdir(), 'zy-drop-'))
  const sourcePath = join(tempDir, fileName)
  try {
    await writeFile(sourcePath, input.bytes, { flag: 'wx' })
    return await ingest(dataRoot, buildIngestInput({
      baseId: input.baseId,
      sourcePath,
      destCategory: input.destCategory,
      preserveTree: input.preserveTree,
      createMissing: input.createMissing,
    }))
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

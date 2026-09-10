import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KbError } from '../../model/error/kb-error.ts'
import { createImportFromPathRequest, type ImportDroppedBytesRequest } from '../../model/request/import-request.ts'
import type { ImportResponse } from '../../model/response/import-response.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { importFiles } from './import.ts'

export function sanitizeDroppedFileName(name: string): string {
  const base = name.trim().split(/[\\/]/).pop() ?? ''
  if (!base || base === '.' || base === '..' || base.includes('\0')) {
    throw new KbError('invalid_field', '拖入文件名无效')
  }
  return base
}

/** 浏览器拖入往往只有 File 没有本机路径，先落到临时文件再走现有导入。 */
export async function importDroppedBytes(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  input: ImportDroppedBytesRequest,
): Promise<ImportResponse> {
  const fileName = sanitizeDroppedFileName(input.fileName)
  if (input.bytes.length === 0) throw new KbError('invalid_field', '拖入文件是空的')
  const tempDir = await mkdtemp(join(tmpdir(), 'zy-drop-'))
  const sourcePath = join(tempDir, fileName)
  try {
    await writeFile(sourcePath, input.bytes, { flag: 'wx' })
    return await importFiles(catalogRepository, dataRoot, createImportFromPathRequest({
      kbId: input.kbId,
      sourcePath,
      destCategory: input.destCategory,
      preserveTree: input.preserveTree,
      createMissing: input.createMissing,
    }))
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

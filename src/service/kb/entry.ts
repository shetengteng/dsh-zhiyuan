import { rm, stat } from 'node:fs/promises'
import { contentRegistry, type EntryPreviewOptions, type EntryWriteChange, type TableEditorPage } from '../../content/host-api.ts'
import type { ReadEntryResult } from '../../model/types.ts'
import { KbError } from '../../model/types.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, resolveDest } from '../../platform/paths.ts'
import { textDocumentBytes } from './base-tree.ts'
import { requireBase } from './bases.ts'
import { readCatalog } from './catalog.ts'

// 条目读、写、删与分页：路径安全检查和格式路由均在 Host 侧完成。

async function fileBytes(filePath: string): Promise<number> {
  try {
    return (await stat(filePath)).size
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0
    throw error
  }
}

export async function readEntry(
  dataRoot: string,
  baseId: string,
  relativePath: string,
  options: EntryPreviewOptions = {},
): Promise<ReadEntryResult> {
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  const baseRoot = baseDir(dataRoot, baseId)
  assertNoSymlinkEscape(baseRoot, absolutePath)
  try {
    return await contentRegistry.readContent({ absolutePath, relativePath, options })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new KbError('not_found', `文件不存在：${relativePath}`)
    }
    throw error
  }
}

/** 经内容 registry 写入条目：整文件替换或稀疏表格修改。 */
export async function writeEntryContent(
  dataRoot: string,
  baseId: string,
  relativePath: string,
  change: EntryWriteChange,
): Promise<void> {
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  const baseRoot = baseDir(dataRoot, baseId)
  assertInside(baseRoot, absolutePath)
  assertNoSymlinkEscape(baseRoot, absolutePath)
  const catalog = await readCatalog(dataRoot)
  const [baseBytes, entryBytes] = await Promise.all([textDocumentBytes(baseRoot), fileBytes(absolutePath)])
  await contentRegistry.writeContent({
    absolutePath,
    relativePath,
    change,
    maxFileBytes: catalog.prefs.maxFileBytes,
    maxBaseBytes: catalog.prefs.maxBaseBytes,
    baseBytesWithoutEntry: Math.max(0, baseBytes - entryBytes),
  })
}

/** 经内容 registry 读取一页有界表格数据。 */
export async function readEntryPage(
  dataRoot: string,
  baseId: string,
  relativePath: string,
  startRow: number,
  pageSize: number,
): Promise<TableEditorPage> {
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  const baseRoot = baseDir(dataRoot, baseId)
  assertInside(baseRoot, absolutePath)
  assertNoSymlinkEscape(baseRoot, absolutePath)
  return contentRegistry.readPage({ absolutePath, relativePath, startRow, pageSize })
}

export async function deleteEntry(dataRoot: string, baseId: string, relativePath: string, confirm: boolean): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除文件或类目需要确认')
  await requireBase(dataRoot, baseId)
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute
  assertInside(baseDir(dataRoot, baseId), absolutePath)
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath)
  await rm(absolutePath, { recursive: true, force: true })
}

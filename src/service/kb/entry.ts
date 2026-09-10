import { rm, stat } from 'node:fs/promises'
import { contentRegistry, type EntryPreviewOptions, type EntryWriteChange, type TableEditorPage } from '../../content/host-api.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type { ReadEntryResponse } from '../../model/response/entry-response.ts'
import { assertInside, assertNoSymlinkEscape, kbDir, resolveDest } from '../../platform/paths.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { textDocumentBytes } from './kb-tree.ts'
import { requireKb } from './kb-lifecycle.ts'

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
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
  relativePath: string,
  options: EntryPreviewOptions = {},
): Promise<ReadEntryResponse> {
  await requireKb(catalogRepository, dataRoot, kbId)
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute
  const kbRoot = kbDir(dataRoot, kbId)
  assertNoSymlinkEscape(kbRoot, absolutePath)
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
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
  relativePath: string,
  change: EntryWriteChange,
): Promise<void> {
  await requireKb(catalogRepository, dataRoot, kbId)
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute
  const kbRoot = kbDir(dataRoot, kbId)
  assertInside(kbRoot, absolutePath)
  assertNoSymlinkEscape(kbRoot, absolutePath)
  const catalog = await catalogRepository.read(dataRoot)
  const [kbBytes, entryBytes] = await Promise.all([textDocumentBytes(kbRoot), fileBytes(absolutePath)])
  await contentRegistry.writeContent({
    absolutePath,
    relativePath,
    change,
    maxFileBytes: catalog.prefs.maxFileBytes,
    maxKbBytes: catalog.prefs.maxKbBytes,
    kbBytesWithoutEntry: Math.max(0, kbBytes - entryBytes),
  })
}

/** 经内容 registry 读取一页有界表格数据。 */
export async function readEntryPage(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
  relativePath: string,
  startRow: number,
  pageSize: number,
): Promise<TableEditorPage> {
  await requireKb(catalogRepository, dataRoot, kbId)
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute
  const kbRoot = kbDir(dataRoot, kbId)
  assertInside(kbRoot, absolutePath)
  assertNoSymlinkEscape(kbRoot, absolutePath)
  return contentRegistry.readPage({ absolutePath, relativePath, startRow, pageSize })
}

export async function deleteEntry(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  kbId: string,
  relativePath: string,
  confirm: boolean,
): Promise<void> {
  if (!confirm) throw new KbError('confirm_required', '删除文件或类目需要确认')
  await requireKb(catalogRepository, dataRoot, kbId)
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute
  assertInside(kbDir(dataRoot, kbId), absolutePath)
  assertNoSymlinkEscape(kbDir(dataRoot, kbId), absolutePath)
  await rm(absolutePath, { recursive: true, force: true })
}

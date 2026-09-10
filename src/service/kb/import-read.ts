import { readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { contentRegistry } from '../../content/host-api.ts'
import { sha256File } from '../../content/shared/file-hash.ts'

// 读：来源遍历 + 库内已有内容盘点（hash 去重快照、库大小统计）。

function isTextFile(name: string): boolean {
  return contentRegistry.isStoredEntryPath(name)
}

/** 递归展开来源：文件返回自身，目录返回其下全部文件。 */
export async function walkSource(source: string): Promise<string[]> {
  const info = await stat(source)
  if (info.isFile()) return [source]
  const files: string[] = []
  const entries = await readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = join(source, entry.name)
    if (entry.isDirectory()) files.push(...await walkSource(entryPath))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files
}

/** 本次导入前的库内内容快照：digest → 库内相对路径，用于同指纹跳过。 */
export async function existingHashes(kbRoot: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const files = await walkSource(kbRoot).catch(() => [] as string[])
  for (const file of files) {
    if (!isTextFile(file)) continue
    map.set(await sha256File(file), relative(kbRoot, file).split(sep).join('/'))
  }
  return map
}

/** 统计库内可计入配额的文字字节数。 */
export async function dirSize(kbRoot: string): Promise<number> {
  let total = 0
  const files = await walkSource(kbRoot).catch(() => [] as string[])
  for (const file of files) {
    if (!isTextFile(file)) continue
    total += (await stat(file)).size
  }
  return total
}

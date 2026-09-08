import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { basename, dirname, join, relative, sep } from 'node:path'
import { writePreparedEntry, type PreparedEntry } from '../../content/shared/ingest-output.ts'
import { assertInside, assertNoSymlinkEscape } from '../../platform/paths.ts'
import type { ImportFileResult } from '../../model/types.ts'
import { outputRelativePath, uniqueName } from './import-check.ts'

// 写：配额与重复判断、安全落盘（containment + symlink 检查、原子写）。

export async function ingestPrepared(
  args: {
    destinationAbsolute: string
    baseRoot: string
    hashes: Map<string, string>
    maxFileBytes: number
    maxBaseBytes: number
  },
  name: string,
  sourceRelativePath: string,
  failed: (code: NonNullable<ImportFileResult['code']>, reason: string) => ImportFileResult,
  prepared: PreparedEntry,
  currentBytes: number,
): Promise<ImportFileResult> {
  if (prepared.byteLength > args.maxFileBytes) {
    return failed('file_too_large', `单文件超过 ${args.maxFileBytes} 字节`)
  }
  if (currentBytes + prepared.byteLength > args.maxBaseBytes) {
    return failed('quota', '本批导入将超过单库文字上限')
  }
  if (args.hashes.has(prepared.digest)) {
    return {
      relPath: args.hashes.get(prepared.digest) ?? sourceRelativePath,
      sourceRelPath: sourceRelativePath,
      status: 'skipped',
      reason: '同指纹已在库中',
      warnings: prepared.warnings,
    }
  }
  if (!prepared.outputName || basename(prepared.outputName) !== prepared.outputName) {
    return failed('io_failed', '转换产物名无效')
  }
  const intendedPath = join(args.destinationAbsolute, outputRelativePath(sourceRelativePath, name, prepared.outputName))
  assertInside(args.baseRoot, intendedPath)
  assertNoSymlinkEscape(args.baseRoot, dirname(intendedPath))
  await mkdir(dirname(intendedPath), { recursive: true })
  let destinationPath = intendedPath
  let status: ImportFileResult['status'] = 'copied'
  if (existsSync(destinationPath)) {
    destinationPath = join(dirname(intendedPath), uniqueName(dirname(intendedPath), basename(intendedPath)))
    status = 'renamed'
  }
  const writtenBytes = await writePreparedEntry(destinationPath, prepared)
  const relativeDestinationPath = relative(args.baseRoot, destinationPath).split(sep).join('/')
  args.hashes.set(prepared.digest, relativeDestinationPath)
  return {
    relPath: relativeDestinationPath,
    sourceRelPath: sourceRelativePath,
    destinationPath: relativeDestinationPath,
    status,
    writtenBytes: writtenBytes || prepared.byteLength,
    warnings: prepared.warnings,
  }
}

import { existsSync } from 'node:fs'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path'
import { CATEGORY_WARN_DEPTH } from './identity.ts'
import { requireBase } from './bases.ts'
import { readCatalog, rememberLastDest } from './catalog.ts'
import { contentRegistry } from './content/host-api.ts'
import { sha256File } from './content/shared/file-hash.ts'
import { writePreparedEntry, type PreparedEntry } from './content/shared/ingest-output.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, expandUserPath, resolveDest } from './paths.ts'
import type { IngestFileResult, IngestInput, IngestResult } from './types.ts'
import { KbError } from './types.ts'

export function buildIngestInput(input: {
  baseId: string
  sourcePath: string
  destCategory: string
  preserveTree?: boolean
  createMissing?: boolean
}): IngestInput {
  return {
    baseId: input.baseId,
    sourcePath: input.sourcePath,
    destCategory: input.destCategory,
    preserveTree: input.preserveTree ?? false,
    createMissing: input.createMissing ?? true,
    onConflict: 'skip',
  }
}

function isTextFile(name: string): boolean {
  return contentRegistry.isStoredEntryPath(name)
}

async function walkSource(source: string): Promise<string[]> {
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

async function existingHashes(baseRoot: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const files = await walkSource(baseRoot).catch(() => [] as string[])
  for (const file of files) {
    if (!isTextFile(file)) continue
    map.set(await sha256File(file), relative(baseRoot, file).split(sep).join('/'))
  }
  return map
}

async function dirSize(baseRoot: string): Promise<number> {
  let total = 0
  const files = await walkSource(baseRoot).catch(() => [] as string[])
  for (const file of files) {
    if (!isTextFile(file)) continue
    total += (await stat(file)).size
  }
  return total
}

function uniqueName(dir: string, name: string): string {
  const ext = extname(name)
  const stem = basename(name, ext)
  let next = name
  let n = 2
  while (existsSync(join(dir, next))) {
    next = `${stem}-${n}${ext}`
    n += 1
  }
  return next
}

function looksBareName(sourcePath: string): boolean {
  const value = sourcePath.trim()
  return Boolean(value) && !value.includes('/') && !value.includes('\\') && !value.startsWith('~') && !isAbsolute(value)
}

function missingSourceMessage(sourcePath: string): string {
  if (looksBareName(sourcePath)) {
    return `源路径不存在：${sourcePath}。浏览器只给出了文件名，请使用导入弹框中的拖拽区域，或点击选择按钮打开系统对话框`
  }
  return `源路径不存在：${sourcePath}`
}

function relativeSourcePath(sourceRoot: string, file: string, preserveTree: boolean): string {
  if (!preserveTree) return basename(file)
  return relative(sourceRoot, file).split(sep).join('/')
}

function outputRelativePath(sourceRelativePath: string, sourceName: string, outputName: string): string {
  if (sourceRelativePath === sourceName) return outputName
  return join(dirname(sourceRelativePath), outputName).split(sep).join('/')
}

function isIngestFailureCode(code: string): code is NonNullable<IngestFileResult['code']> {
  return code === 'ext_denied'
    || code === 'file_too_large'
    || code === 'quota'
    || code === 'path_escape'
    || code === 'csv_encoding_invalid'
    || code === 'csv_control_character'
    || code === 'csv_line_too_long'
    || code === 'encoding_unsupported'
    || code === 'io_failed'
}

export async function ingest(dataRoot: string, input: IngestInput): Promise<IngestResult> {
  await requireBase(dataRoot, input.baseId)
  const catalog = await readCatalog(dataRoot)
  const source = expandUserPath(input.sourcePath)
  if (!existsSync(source)) throw new KbError('not_found', missingSourceMessage(input.sourcePath))
  const destination = resolveDest(dataRoot, input.baseId, input.destCategory)
  const baseRoot = baseDir(dataRoot, input.baseId)
  assertInside(baseRoot, destination.absolute)
  const createMissing = input.createMissing !== false
  const preserveTree = Boolean(input.preserveTree)
  if (createMissing) await mkdir(destination.absolute, { recursive: true })
  else if (!existsSync(destination.absolute)) {
    throw new KbError('not_found', `类目不存在：${destination.relative || '(库根)'}`)
  }

  const hashes = await existingHashes(baseRoot)
  const currentBytes = await dirSize(baseRoot)
  const createdDirs = new Set<string>()
  if (createMissing && destination.relative) createdDirs.add(destination.relative)

  const sourceInfo = await stat(source)
  const sourceRoot = sourceInfo.isDirectory() ? source : dirname(source)
  const files = await walkSource(source)
  const result: IngestResult = {
    baseId: input.baseId,
    copied: [],
    renamed: [],
    skipped: 0,
    failed: 0,
    createdDirs: [],
    files: [],
    warnings: destination.deep ? [`类目深度超过 ${CATEGORY_WARN_DEPTH}，仍已写入`] : [],
  }

  let addedBytes = 0
  for (const file of files) {
    const fileResults = await ingestOne({
      file,
      sourceRoot,
      destinationAbsolute: destination.absolute,
      preserveTree,
      baseRoot,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxBaseBytes: catalog.prefs.maxBaseBytes,
      currentBytes: currentBytes + addedBytes,
    })
    for (const fileResult of fileResults) {
      result.files.push(fileResult)
      if (fileResult.warnings?.length) result.warnings.push(...fileResult.warnings)
      if (fileResult.status === 'skipped') result.skipped += 1
      else if (fileResult.status === 'failed') result.failed += 1
      else {
        result.copied.push(fileResult.relPath)
        if (fileResult.status === 'renamed') result.renamed.push(fileResult.relPath)
        if (fileResult.relPath.includes('/')) createdDirs.add(dirname(fileResult.relPath).split(sep).join('/'))
        addedBytes += fileResult.writtenBytes ?? 0
      }
    }
  }
  result.createdDirs = [...createdDirs].filter(Boolean)
  await rememberLastDest(dataRoot, input.baseId, destination.relative)
  return result
}

async function ingestOne(args: {
  file: string
  sourceRoot: string
  destinationAbsolute: string
  preserveTree: boolean
  baseRoot: string
  hashes: Map<string, string>
  maxFileBytes: number
  maxBaseBytes: number
  currentBytes: number
}): Promise<IngestFileResult[]> {
  const name = basename(args.file)
  const sourceRelativePath = relativeSourcePath(args.sourceRoot, args.file, args.preserveTree)
  const failed = (code: NonNullable<IngestFileResult['code']>, reason: string): IngestFileResult => ({
    relPath: sourceRelativePath,
    sourceRelPath: sourceRelativePath,
    status: 'failed',
    code,
    reason,
  })

  try {
    return await ingestOneUnsafe(args, name, sourceRelativePath, failed)
  } catch (error) {
    if (error instanceof KbError) {
      if (isIngestFailureCode(error.code)) return [failed(error.code, error.message)]
      return [failed('io_failed', '文件处理失败，请检查权限或磁盘空间')]
    }
    return [failed('io_failed', '文件处理失败，请检查权限或磁盘空间')]
  }
}

async function ingestOneUnsafe(
  args: {
    file: string
    sourceRoot: string
    destinationAbsolute: string
    preserveTree: boolean
    baseRoot: string
    hashes: Map<string, string>
    maxFileBytes: number
    maxBaseBytes: number
    currentBytes: number
  },
  name: string,
  sourceRelativePath: string,
  failed: (code: NonNullable<IngestFileResult['code']>, reason: string) => IngestFileResult,
): Promise<IngestFileResult[]> {
  if (!contentRegistry.sourceFormatForPath(name)) {
    return [failed('ext_denied', `只支持 ${contentRegistry.sourceExtensions().join(' / ')}`)]
  }
  const preparedEntries = await contentRegistry.prepareImport({
    sourcePath: args.file,
    sourceName: name,
    maxFileBytes: args.maxFileBytes,
  })
  if (!preparedEntries.length) return [failed('io_failed', '没有可导入的内容')]
  const results: IngestFileResult[] = []
  let extraBytes = 0
  for (const prepared of preparedEntries) {
    const written = await ingestPrepared(args, name, sourceRelativePath, failed, prepared, args.currentBytes + extraBytes)
    results.push(written)
    if (written.status === 'copied' || written.status === 'renamed') extraBytes += written.writtenBytes ?? 0
  }
  return results
}

async function ingestPrepared(
  args: {
    destinationAbsolute: string
    baseRoot: string
    hashes: Map<string, string>
    maxFileBytes: number
    maxBaseBytes: number
  },
  name: string,
  sourceRelativePath: string,
  failed: (code: NonNullable<IngestFileResult['code']>, reason: string) => IngestFileResult,
  prepared: PreparedEntry,
  currentBytes: number,
): Promise<IngestFileResult> {
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
  let status: IngestFileResult['status'] = 'copied'
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

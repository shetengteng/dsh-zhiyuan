import { existsSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { basename, dirname, sep } from 'node:path'
import { contentRegistry } from '../../content/host-api.ts'
import { CATEGORY_WARN_DEPTH } from '../../model/constants.ts'
import { KbError } from '../../model/error/kb-error.ts'
import type { ImportFromPathRequest } from '../../model/request/import-request.ts'
import type { ImportFileResponse, ImportResponse } from '../../model/response/import-response.ts'
import { assertInside, kbDir, expandUserPath, resolveDest } from '../../platform/paths.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { requireKb } from './kb-lifecycle.ts'
import { isImportFailureCode, missingSourceMessage, relativeSourcePath } from './import-check.ts'
import { rememberLastDestinationCategory } from './import-destination.ts'
import { dirSize, existingHashes, walkSource } from './import-read.ts'
import { ingestPrepared } from './import-write.ts'

// 导入编排：批次调度、逐文件调用（读→查→写）、结果汇总、最近类目记忆。

export async function importFiles(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  input: ImportFromPathRequest,
): Promise<ImportResponse> {
  await requireKb(catalogRepository, dataRoot, input.kbId)
  const catalog = await catalogRepository.read(dataRoot)
  const source = expandUserPath(input.sourcePath)
  if (!existsSync(source)) throw new KbError('not_found', missingSourceMessage(input.sourcePath))
  const destination = resolveDest(dataRoot, input.kbId, input.destCategory)
  const kbRoot = kbDir(dataRoot, input.kbId)
  assertInside(kbRoot, destination.absolute)
  const createMissing = input.createMissing !== false
  const preserveTree = Boolean(input.preserveTree)
  if (createMissing) await mkdir(destination.absolute, { recursive: true })
  else if (!existsSync(destination.absolute)) {
    throw new KbError('not_found', `类目不存在：${destination.relative || '(库根)'}`)
  }

  const hashes = await existingHashes(kbRoot)
  const currentBytes = await dirSize(kbRoot)
  const createdDirs = new Set<string>()
  if (createMissing && destination.relative) createdDirs.add(destination.relative)

  const sourceInfo = await stat(source)
  const sourceRoot = sourceInfo.isDirectory() ? source : dirname(source)
  const files = await walkSource(source)
  const result: ImportResponse = {
    kbId: input.kbId,
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
      kbRoot,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxKbBytes: catalog.prefs.maxKbBytes,
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
  await rememberLastDestinationCategory(catalogRepository, dataRoot, input.kbId, destination.relative)
  return result
}

async function ingestOne(args: {
  file: string
  sourceRoot: string
  destinationAbsolute: string
  preserveTree: boolean
  kbRoot: string
  hashes: Map<string, string>
  maxFileBytes: number
  maxKbBytes: number
  currentBytes: number
}): Promise<ImportFileResponse[]> {
  const name = basename(args.file)
  const sourceRelativePath = relativeSourcePath(args.sourceRoot, args.file, args.preserveTree)
  const failed = (code: NonNullable<ImportFileResponse['code']>, reason: string): ImportFileResponse => ({
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
      if (isImportFailureCode(error.code)) return [failed(error.code, error.message)]
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
    kbRoot: string
    hashes: Map<string, string>
    maxFileBytes: number
    maxKbBytes: number
    currentBytes: number
  },
  name: string,
  sourceRelativePath: string,
  failed: (code: NonNullable<ImportFileResponse['code']>, reason: string) => ImportFileResponse,
): Promise<ImportFileResponse[]> {
  if (!contentRegistry.sourceFormatForPath(name)) {
    return [failed('ext_denied', `只支持 ${contentRegistry.sourceExtensions().join(' / ')}`)]
  }
  const preparedEntries = await contentRegistry.prepareImport({
    sourcePath: args.file,
    sourceName: name,
    maxFileBytes: args.maxFileBytes,
  })
  if (!preparedEntries.length) return [failed('io_failed', '没有可导入的内容')]
  const results: ImportFileResponse[] = []
  let extraBytes = 0
  for (const prepared of preparedEntries) {
    const written = await ingestPrepared(args, name, sourceRelativePath, failed, prepared, args.currentBytes + extraBytes)
    results.push(written)
    if (written.status === 'copied' || written.status === 'renamed') extraBytes += written.writtenBytes ?? 0
  }
  return results
}

import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path'
import { CATEGORY_WARN_DEPTH, TEXT_EXTS } from './identity.ts'
import { requireBase } from './bases.ts'
import { readCatalog, rememberLastDest } from './catalog.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, expandUserPath, resolveDest } from './paths.ts'
import type { IngestFileResult, IngestInput, IngestResult } from './types.ts'
import { KbError } from './types.ts'

function extensionOf(name: string): string {
  return extname(name).toLowerCase()
}

function isTextFile(name: string): boolean {
  return TEXT_EXTS.has(extensionOf(name))
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve())
  })
  return hash.digest('hex')
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
    return `源路径不存在：${sourcePath}。浏览器只给出了文件名，请点「选择文件」打开系统对话框，或粘贴完整本机路径`
  }
  return `源路径不存在：${sourcePath}`
}

function relativeSourcePath(sourceRoot: string, file: string, preserveTree: boolean): string {
  if (!preserveTree) return basename(file)
  return relative(sourceRoot, file).split(sep).join('/')
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
    const fileResult = await ingestOne({
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
    result.files.push(fileResult)
    if (fileResult.status === 'skipped') result.skipped += 1
    else if (fileResult.status === 'failed') result.failed += 1
    else {
      result.copied.push(fileResult.relPath)
      if (fileResult.status === 'renamed') result.renamed.push(fileResult.relPath)
      if (fileResult.relPath.includes('/')) createdDirs.add(dirname(fileResult.relPath).split(sep).join('/'))
      addedBytes += (await stat(join(baseRoot, fileResult.relPath))).size
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
}): Promise<IngestFileResult> {
  const name = basename(args.file)
  if (!isTextFile(name)) {
    return { relPath: name, status: 'failed', reason: '只支持 .md / .txt / .markdown' }
  }
  const size = (await stat(args.file)).size
  if (size > args.maxFileBytes) {
    return { relPath: name, status: 'failed', reason: `单文件超过 ${args.maxFileBytes} 字节` }
  }
  if (args.currentBytes + size > args.maxBaseBytes) {
    return { relPath: name, status: 'failed', reason: '本批导入将超过单库文字上限' }
  }
  const digest = await sha256File(args.file)
  if (args.hashes.has(digest)) {
    return { relPath: args.hashes.get(digest) ?? name, status: 'skipped', reason: '同指纹已在库中' }
  }
  const sourceRelativePath = relativeSourcePath(args.sourceRoot, args.file, args.preserveTree)
  const intendedPath = join(args.destinationAbsolute, sourceRelativePath)
  assertInside(args.baseRoot, intendedPath)
  assertNoSymlinkEscape(args.baseRoot, dirname(intendedPath))
  await mkdir(dirname(intendedPath), { recursive: true })
  let destinationPath = intendedPath
  let status: IngestFileResult['status'] = 'copied'
  if (existsSync(destinationPath)) {
    destinationPath = join(dirname(intendedPath), uniqueName(dirname(intendedPath), basename(intendedPath)))
    status = 'renamed'
  }
  await copyFile(args.file, destinationPath)
  const relativeDestinationPath = relative(args.baseRoot, destinationPath).split(sep).join('/')
  args.hashes.set(digest, relativeDestinationPath)
  return { relPath: relativeDestinationPath, status }
}

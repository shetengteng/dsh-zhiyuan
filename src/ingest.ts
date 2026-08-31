import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { TEXT_EXTS } from './identity.ts'
import { requireBase } from './bases.ts'
import { readCatalog } from './catalog.ts'
import { assertInside, assertNoSymlinkEscape, baseDir, expandUserPath, resolveDest } from './paths.ts'
import type { IngestFileResult, IngestInput, IngestResult } from './types.ts'
import { KbError } from './types.ts'

function extOf(name: string): string {
  return extname(name).toLowerCase()
}

function isTextFile(name: string): boolean {
  return TEXT_EXTS.has(extOf(name))
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
    const path = join(source, entry.name)
    if (entry.isDirectory()) files.push(...await walkSource(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

async function existingHashes(root: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const files = await walkSource(root).catch(() => [] as string[])
  for (const file of files) {
    if (!isTextFile(file)) continue
    map.set(await sha256File(file), relative(root, file).split(sep).join('/'))
  }
  return map
}

async function dirSize(root: string): Promise<number> {
  let total = 0
  const files = await walkSource(root).catch(() => [] as string[])
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

function sourceRel(sourceRoot: string, file: string, preserveTree: boolean): string {
  if (!preserveTree) return basename(file)
  return relative(sourceRoot, file).split(sep).join('/')
}

export async function ingest(dataRoot: string, input: IngestInput): Promise<IngestResult> {
  await requireBase(dataRoot, input.baseId)
  const catalog = await readCatalog(dataRoot)
  const source = expandUserPath(input.sourcePath)
  if (!existsSync(source)) throw new KbError('not_found', `源路径不存在：${input.sourcePath}`)
  const dest = resolveDest(dataRoot, input.baseId, input.destCategory)
  const root = baseDir(dataRoot, input.baseId)
  assertInside(root, dest.absolute)
  const createMissing = input.createMissing !== false
  const preserveTree = Boolean(input.preserveTree)
  if (createMissing) await mkdir(dest.absolute, { recursive: true })
  else if (!existsSync(dest.absolute)) {
    throw new KbError('not_found', `类目不存在：${dest.relative || '(库根)'}`)
  }

  const hashes = await existingHashes(root)
  const currentBytes = await dirSize(root)
  const createdDirs = new Set<string>()
  if (createMissing && dest.relative) createdDirs.add(dest.relative)

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
  }

  let added = 0
  for (const file of files) {
    const item = await ingestOne({
      file,
      sourceRoot,
      destAbs: dest.absolute,
      destRel: dest.relative,
      preserveTree,
      root,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxBaseBytes: catalog.prefs.maxBaseBytes,
      currentBytes: currentBytes + added,
    })
    result.files.push(item)
    if (item.status === 'skipped') result.skipped += 1
    else if (item.status === 'failed') result.failed += 1
    else {
      result.copied.push(item.relPath)
      if (item.status === 'renamed') result.renamed.push(item.relPath)
      if (item.relPath.includes('/')) createdDirs.add(dirname(item.relPath).split(sep).join('/'))
      added += (await stat(join(root, item.relPath))).size
    }
  }
  result.createdDirs = [...createdDirs].filter(Boolean)
  return result
}

async function ingestOne(args: {
  file: string
  sourceRoot: string
  destAbs: string
  destRel: string
  preserveTree: boolean
  root: string
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
  const relFromSource = sourceRel(args.sourceRoot, args.file, args.preserveTree)
  const intended = join(args.destAbs, relFromSource)
  assertInside(args.root, intended)
  assertNoSymlinkEscape(args.root, dirname(intended))
  await mkdir(dirname(intended), { recursive: true })
  let destFile = intended
  let status: IngestFileResult['status'] = 'copied'
  if (existsSync(destFile)) {
    destFile = join(dirname(intended), uniqueName(dirname(intended), basename(intended)))
    status = 'renamed'
  }
  await copyFile(args.file, destFile)
  const relPath = relative(args.root, destFile).split(sep).join('/')
  args.hashes.set(digest, relPath)
  return { relPath, status }
}

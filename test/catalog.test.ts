import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_MAX_FILE_BYTES, DEFAULT_MAX_KB_BYTES } from '../src/model/constants.ts'
import type { Catalog } from '../src/model/entity/catalog.ts'
import { emptyCatalog, parseCatalog } from '../src/repository/kb/catalog-codec.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { cleanAliases, removeKb, upsertKb } from '../src/service/kb/catalog-mutation.ts'
import { getLastDestinationCategory, rememberLastDestinationCategory } from '../src/service/kb/import-destination.ts'

const catalogRepository = new FileCatalogRepository()
const readCatalog = (dataRoot: string): Promise<Catalog> => catalogRepository.read(dataRoot)
const writeCatalog = (dataRoot: string, catalog: Catalog): Promise<void> => catalogRepository.save(dataRoot, catalog)
const lastDestCategory = (dataRoot: string, kbId: string): Promise<string | undefined> => (
  getLastDestinationCategory(catalogRepository, dataRoot, kbId)
)
const rememberLastDest = (dataRoot: string, kbId: string, destinationCategory: string): Promise<void> => (
  rememberLastDestinationCategory(catalogRepository, dataRoot, kbId, destinationCategory)
)

function card(id: string, title = id) {
  return { id, title, description: '描述', aliases: [], createdAt: 1, lastUsedAt: 1 }
}

test('emptyCatalog 默认 version 2 prefs', () => {
  const catalog = emptyCatalog()
  assert.equal(catalog.version, 2)
  assert.equal(catalog.lastUsedKbId, '')
  assert.equal(catalog.prefs.defaultKbId, '')
  assert.equal(catalog.prefs.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  assert.equal(catalog.prefs.maxKbBytes, DEFAULT_MAX_KB_BYTES)
  assert.deepEqual(catalog.kbs, [])
})

test('parseCatalog 只读取 version 2 canonical 字段', () => {
  assert.equal(parseCatalog(null).kbs.length, 0)
  assert.equal(parseCatalog('x').prefs.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  const parsed = parseCatalog({
    version: 2,
    lastUsedKbId: 12,
    prefs: { defaultKbId: 'work', maxFileBytes: Number.NaN, maxKbBytes: Infinity },
    kbs: [
      null,
      { id: '', title: '空 id' },
      { title: '无 id' },
      { id: 'work', title: 1, description: 2, aliases: [' 工作 ', '', 3, '公司', '工作'], createdAt: 'x', lastUsedAt: 9 },
    ],
  })
  assert.equal(parsed.version, 2)
  assert.equal(parsed.lastUsedKbId, '')
  assert.equal(parsed.prefs.defaultKbId, 'work')
  assert.equal(parsed.prefs.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  assert.equal(parsed.prefs.maxKbBytes, DEFAULT_MAX_KB_BYTES)
  assert.equal(parsed.kbs.length, 1)
  assert.equal(parsed.kbs[0].id, 'work')
  assert.equal(parsed.kbs[0].title, '')
  assert.equal(parsed.kbs[0].description, '')
  assert.deepEqual(parsed.kbs[0].aliases, ['工作', '公司', '工作'])
  assert.equal(parsed.kbs[0].createdAt, 0)
  assert.equal(parsed.kbs[0].lastUsedAt, 9)
  assert.equal(parsed.kbs[0].lastDestCategory, undefined)
  assert.deepEqual(parseCatalog({ version: 1, bases: [card('legacy')] }).kbs, [])
})

test('parseCatalog 保留 lastDestCategory 字符串', () => {
  const parsed = parseCatalog({ version: 2, kbs: [{ id: 'work', lastDestCategory: '合同/2024' }] })
  assert.equal(parsed.kbs[0].lastDestCategory, '合同/2024')
  assert.equal(parseCatalog({ version: 2, kbs: [{ id: 'work', lastDestCategory: 1 }] }).kbs[0].lastDestCategory, undefined)
})

test('cleanAliases 去空白去重；缺省空数组', () => {
  assert.deepEqual(cleanAliases(undefined), [])
  assert.deepEqual(cleanAliases([' 工作 ', '公司', '工作', '', '  ']), ['工作', '公司'])
})

test('upsertKb 同 id 覆盖；removeKb 清 lastUsed 与 default', () => {
  let catalog = upsertKb(emptyCatalog(), card('work', 'A'))
  catalog = upsertKb(catalog, { ...card('work', 'B'), description: 'd' })
  catalog = upsertKb(catalog, card('life', '生活'))
  catalog.lastUsedKbId = 'work'
  catalog.prefs.defaultKbId = 'work'
  assert.equal(catalog.kbs.length, 2)
  assert.equal(catalog.kbs.find((item) => item.id === 'work')?.title, 'B')
  const removed = removeKb(catalog, 'work')
  assert.equal(removed.kbs.length, 1)
  assert.equal(removed.lastUsedKbId, '')
  assert.equal(removed.prefs.defaultKbId, '')
  assert.equal(removeKb(removed, 'life').lastUsedKbId, '')
})

test('readCatalog 缺文件给空目录；写读往返；坏 JSON 抛错', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-'))
  const empty = await readCatalog(root)
  assert.deepEqual(empty.kbs, [])
  const next = emptyCatalog()
  next.lastUsedKbId = 'work'
  next.kbs.push({ ...card('work', '工作库'), aliases: ['工作'], lastUsedAt: 2 })
  await writeCatalog(root, next)
  const loaded = await readCatalog(root)
  assert.equal(loaded.lastUsedKbId, 'work')
  assert.equal(loaded.kbs[0].title, '工作库')
  await writeFile(join(root, 'catalog.json'), '{not-json', 'utf8')
  await assert.rejects(() => readCatalog(root), SyntaxError)
  await rm(root, { recursive: true, force: true })
})

test('v1 catalog 与 bases/ 一次性迁移为 v2 与 kbs/', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-migrate-'))
  await mkdir(join(root, 'bases', 'work', '合同'), { recursive: true })
  await writeFile(join(root, 'bases', 'work', '合同', 'a.md'), '正文')
  await writeFile(join(root, 'catalog.json'), JSON.stringify({
    version: 1,
    lastUsedBaseId: 'work',
    prefs: { defaultBaseId: 'work', maxFileBytes: 123, maxBaseBytes: 456 },
    bases: [{ ...card('work', '工作库'), lastDestCategory: '合同' }],
  }))

  const migrated = await readCatalog(root)
  assert.equal(migrated.version, 2)
  assert.equal(migrated.lastUsedKbId, 'work')
  assert.deepEqual(migrated.prefs, { defaultKbId: 'work', maxFileBytes: 123, maxKbBytes: 456 })
  assert.equal(migrated.kbs[0].title, '工作库')
  assert.equal(migrated.kbs[0].lastDestCategory, '合同')
  assert.equal(existsSync(join(root, 'kbs', 'work', '合同', 'a.md')), true)
  assert.equal(existsSync(join(root, 'bases')), false)
  const stored = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as Record<string, unknown>
  assert.equal(stored.version, 2)
  assert.equal('bases' in stored, false)
  assert.equal('lastUsedBaseId' in stored, false)
  assert.equal((stored.prefs as Record<string, unknown>).defaultKbId, 'work')
  assert.equal((stored.prefs as Record<string, unknown>).maxKbBytes, 456)
  await rm(root, { recursive: true, force: true })
})

test('直接 save 也先迁移旧目录', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-save-migrate-'))
  await mkdir(join(root, 'bases', 'legacy'), { recursive: true })
  await writeCatalog(root, emptyCatalog())
  assert.equal(existsSync(join(root, 'bases')), false)
  assert.equal(existsSync(join(root, 'kbs', 'legacy')), true)
  assert.equal((await readCatalog(root)).version, 2)
  await rm(root, { recursive: true, force: true })
})

test('version 2 混入旧字段时也只保留 canonical schema', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-mixed-'))
  await writeFile(join(root, 'catalog.json'), JSON.stringify({
    version: 2,
    lastUsedKbId: 'current',
    lastUsedBaseId: 'legacy',
    prefs: { defaultKbId: 'current', defaultBaseId: 'legacy', maxFileBytes: 123, maxBaseBytes: 456 },
    kbs: [card('current', '当前库')],
    bases: [card('legacy', '旧库')],
  }))

  const migrated = await readCatalog(root)
  assert.equal(migrated.lastUsedKbId, 'current')
  assert.deepEqual(migrated.prefs, { defaultKbId: 'current', maxFileBytes: 123, maxKbBytes: 456 })
  assert.deepEqual(migrated.kbs.map((item) => item.id), ['current'])
  const stored = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as Record<string, unknown>
  assert.equal('lastUsedBaseId' in stored, false)
  assert.equal('bases' in stored, false)
  assert.equal('defaultBaseId' in (stored.prefs as Record<string, unknown>), false)
  assert.equal('maxBaseBytes' in (stored.prefs as Record<string, unknown>), false)
  await rm(root, { recursive: true, force: true })
})

test('无 catalog 时只迁移旧目录，不凭空创建 catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-no-file-'))
  await mkdir(join(root, 'bases', 'life'), { recursive: true })
  const catalog = await readCatalog(root)
  assert.deepEqual(catalog.kbs, [])
  assert.equal(existsSync(join(root, 'kbs', 'life')), true)
  assert.equal(existsSync(join(root, 'bases')), false)
  assert.equal(existsSync(join(root, 'catalog.json')), false)
  await rm(root, { recursive: true, force: true })
})

test('只有 kbs/ 时保留新目录；双目录冲突拒绝且不删除任一侧', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-conflict-'))
  await mkdir(join(root, 'kbs', 'current'), { recursive: true })
  assert.deepEqual((await readCatalog(root)).kbs, [])
  await mkdir(join(root, 'bases', 'legacy'), { recursive: true })
  await assert.rejects(() => readCatalog(root), /迁移冲突/)
  assert.equal(existsSync(join(root, 'bases', 'legacy')), true)
  assert.equal(existsSync(join(root, 'kbs', 'current')), true)
  await rm(root, { recursive: true, force: true })
})

test('rememberLastDest 写入；同值不改；缺库静默', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat3-'))
  const catalog = emptyCatalog()
  catalog.kbs.push(card('work', '工作库'))
  await writeCatalog(root, catalog)
  assert.equal(await lastDestCategory(root, 'work'), undefined)
  await rememberLastDest(root, 'work', '合同/2024')
  assert.equal(await lastDestCategory(root, 'work'), '合同/2024')
  await rememberLastDest(root, 'work', '合同/2024')
  await rememberLastDest(root, 'ghost', 'x')
  assert.equal(await lastDestCategory(root, 'ghost'), undefined)
  await rm(root, { recursive: true, force: true })
})

test('并发写 catalog 不丢另一张卡片的字段', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-lock-'))
  const catalog = emptyCatalog()
  catalog.kbs.push(card('a', 'A'), card('b', 'B'))
  await writeCatalog(root, catalog)
  await Promise.all([
    rememberLastDest(root, 'a', 'one'),
    rememberLastDest(root, 'b', 'two'),
  ])
  const loaded = await readCatalog(root)
  assert.equal(loaded.kbs.find((item) => item.id === 'a')?.lastDestCategory, 'one')
  assert.equal(loaded.kbs.find((item) => item.id === 'b')?.lastDestCategory, 'two')
  await rm(root, { recursive: true, force: true })
})

test('readCatalog 遇到非 ENOENT 继续抛', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat2-'))
  await mkdir(join(root, 'catalog.json'))
  await assert.rejects(() => readCatalog(root))
  await rm(root, { recursive: true, force: true })
})

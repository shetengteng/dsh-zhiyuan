import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  cleanAliases,
  emptyCatalog,
  lastDestCategory,
  parseCatalog,
  readCatalog,
  rememberLastDest,
  removeBase,
  upsertBase,
  writeCatalog,
} from '../src/catalog.ts'
import { DEFAULT_MAX_BASE_BYTES, DEFAULT_MAX_FILE_BYTES } from '../src/identity.ts'

test('emptyCatalog 默认 prefs', () => {
  const catalog = emptyCatalog()
  assert.equal(catalog.version, 1)
  assert.equal(catalog.lastUsedBaseId, '')
  assert.equal(catalog.prefs.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  assert.equal(catalog.prefs.maxBaseBytes, DEFAULT_MAX_BASE_BYTES)
  assert.deepEqual(catalog.bases, [])
})

test('parseCatalog：脏数据、缺字段、非法卡片被丢掉', () => {
  assert.equal(parseCatalog(null).bases.length, 0)
  assert.equal(parseCatalog('x').prefs.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  const parsed = parseCatalog({
    version: 9,
    lastUsedBaseId: 12,
    prefs: { defaultBaseId: 'work', maxFileBytes: Number.NaN, maxBaseBytes: Infinity },
    bases: [
      null,
      { id: '', title: '空 id' },
      { title: '无 id' },
      { id: 'work', title: 1, description: 2, aliases: [' 工作 ', '', 3, '公司', '工作'], createdAt: 'x', lastUsedAt: 9 },
    ],
  })
  assert.equal(parsed.version, 1)
  assert.equal(parsed.lastUsedBaseId, '')
  assert.equal(parsed.prefs.defaultBaseId, 'work')
  assert.equal(parsed.prefs.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  assert.equal(parsed.prefs.maxBaseBytes, DEFAULT_MAX_BASE_BYTES)
  assert.equal(parsed.bases.length, 1)
  assert.equal(parsed.bases[0].id, 'work')
  assert.equal(parsed.bases[0].title, '')
  assert.equal(parsed.bases[0].description, '')
  assert.deepEqual(parsed.bases[0].aliases, ['工作', '公司', '工作'])
  assert.equal(parsed.bases[0].createdAt, 0)
  assert.equal(parsed.bases[0].lastUsedAt, 9)
  assert.equal(parsed.bases[0].lastDestCategory, undefined)
})

test('parseCatalog 保留 lastDestCategory 字符串', () => {
  const parsed = parseCatalog({
    bases: [{ id: 'work', lastDestCategory: '合同/2024' }],
  })
  assert.equal(parsed.bases[0].lastDestCategory, '合同/2024')
  assert.equal(parseCatalog({ bases: [{ id: 'work', lastDestCategory: 1 }] }).bases[0].lastDestCategory, undefined)
})

test('cleanAliases 去空白去重；缺省空数组', () => {
  assert.deepEqual(cleanAliases(undefined), [])
  assert.deepEqual(cleanAliases([' 工作 ', '公司', '工作', '', '  ']), ['工作', '公司'])
})

test('upsertBase 同 id 覆盖；removeBase 清 lastUsed 与 default', () => {
  const card = {
    id: 'work',
    title: 'A',
    description: 'd',
    aliases: [],
    createdAt: 1,
    lastUsedAt: 1,
  }
  const other = { ...card, id: 'life', title: '生活' }
  let catalog = upsertBase(emptyCatalog(), card)
  catalog = upsertBase(catalog, { ...card, title: 'B' })
  catalog = upsertBase(catalog, other)
  catalog.lastUsedBaseId = 'work'
  catalog.prefs.defaultBaseId = 'work'
  assert.equal(catalog.bases.length, 2)
  assert.equal(catalog.bases.find((item) => item.id === 'work')?.title, 'B')
  const removed = removeBase(catalog, 'work')
  assert.equal(removed.bases.length, 1)
  assert.equal(removed.lastUsedBaseId, '')
  assert.equal(removed.prefs.defaultBaseId, '')
  assert.equal(removeBase(removed, 'life').lastUsedBaseId, '')
})

test('readCatalog 缺文件给空目录；写读往返；坏 JSON 抛错', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat-'))
  const empty = await readCatalog(root)
  assert.deepEqual(empty.bases, [])
  const next = emptyCatalog()
  next.lastUsedBaseId = 'work'
  next.bases.push({
    id: 'work',
    title: '工作库',
    description: '描述',
    aliases: ['工作'],
    createdAt: 1,
    lastUsedAt: 2,
  })
  await writeCatalog(root, next)
  const loaded = await readCatalog(root)
  assert.equal(loaded.lastUsedBaseId, 'work')
  assert.equal(loaded.bases[0].title, '工作库')
  await writeFile(join(root, 'catalog.json'), '{not-json', 'utf8')
  await assert.rejects(() => readCatalog(root), SyntaxError)
  await rm(root, { recursive: true, force: true })
})

test('rememberLastDest 写入；同值不改；缺库静默', async () => {
  assert.equal(parseCatalog({
    bases: [{ id: 'work', title: 't', lastDestCategory: '合同/2024' }],
  }).bases[0].lastDestCategory, '合同/2024')
  const root = await mkdtemp(join(tmpdir(), 'zy-cat3-'))
  const catalog = emptyCatalog()
  catalog.bases.push({
    id: 'work',
    title: '工作库',
    description: '描述',
    aliases: [],
    createdAt: 1,
    lastUsedAt: 1,
  })
  await writeCatalog(root, catalog)
  assert.equal(await lastDestCategory(root, 'work'), undefined)
  await rememberLastDest(root, 'work', '合同/2024')
  assert.equal(await lastDestCategory(root, 'work'), '合同/2024')
  await rememberLastDest(root, 'work', '合同/2024')
  await rememberLastDest(root, 'ghost', 'x')
  assert.equal(await lastDestCategory(root, 'ghost'), undefined)
  await rm(root, { recursive: true, force: true })
})

test('readCatalog 遇到非 ENOENT 继续抛', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-cat2-'))
  await mkdir(join(root, 'catalog.json'))
  await assert.rejects(() => readCatalog(root))
  await rm(root, { recursive: true, force: true })
})

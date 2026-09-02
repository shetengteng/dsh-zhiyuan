import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase, deleteBase, deleteEntry, listBases, listTree, readEntry, updateBase, writeEntry } from '../src/bases.ts'
import { ingest } from '../src/ingest.ts'
import { KbError } from '../src/types.ts'

async function sandbox(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zy-base-'))
}

test('createBase 写入目录和 catalog，不建默认类目', async () => {
  const root = await sandbox()
  const card = await createBase(root, {
    title: '工作库',
    description: '公司合同、会议纪要、供应商往来。问条款、纪要、交付开这个库。个人账单、家庭、医疗不要放。',
    aliases: ['工作', '公司', ' 工作 '],
  })
  assert.match(card.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.deepEqual(card.aliases, ['工作', '公司'])
  const listed = await listBases(root)
  assert.equal(listed.length, 1)
  assert.equal(listed[0].id, card.id)
  assert.equal(listed[0].approxDocs, 0)
  assert.deepEqual(listed[0].categories, [])
  await rm(root, { recursive: true, force: true })
})

test('标题不能重复；标题和描述不能为空', async () => {
  const root = await sandbox()
  const first = await createBase(root, { title: '工作库', description: '描述' })
  await assert.rejects(() => createBase(root, { title: '工作库', description: '描述' }), /标题.*已存在/)
  await assert.rejects(() => createBase(root, { title: '  工作库  ', description: '描述' }), /标题.*已存在/)
  await assert.rejects(() => createBase(root, { title: '生活', description: '' }), KbError)
  const second = await createBase(root, { title: '生活', description: '描述' })
  await assert.rejects(() => updateBase(root, second.id, { title: first.title }), /标题.*已存在/)
  await rm(root, { recursive: true, force: true })
})

test('无 catalog 也能扫 bases/；无卡片时描述为空', async () => {
  const root = await sandbox()
  await mkdir(join(root, 'bases', 'life'), { recursive: true })
  const listed = await listBases(root)
  assert.equal(listed[0].id, 'life')
  assert.equal(listed[0].description, '')
  await rm(root, { recursive: true, force: true })
})

test('updateBase 不能改 id；deleteBase 需确认', async () => {
  const root = await sandbox()
  const created = await createBase(root, { title: '工作库', description: '描述' })
  const updated = await updateBase(root, created.id, { title: '公司库' })
  assert.equal(updated.id, created.id)
  assert.equal(updated.title, '公司库')
  await assert.rejects(() => deleteBase(root, created.id, false), KbError)
  await deleteBase(root, created.id, true)
  assert.equal((await listBases(root)).length, 0)
  await rm(root, { recursive: true, force: true })
})

test('write/read/deleteEntry 与 listTree；删除需确认', async () => {
  const root = await sandbox()
  const base = await createBase(root, { title: '工作库', description: '描述' })
  await writeEntry(root, base.id, '合同/2024/a.md', 'hello')
  assert.deepEqual(await readEntry(root, base.id, '合同/2024/a.md'), { path: '合同/2024/a.md', text: 'hello' })
  const tree = await listTree(root, base.id)
  assert.equal(tree[0].name, '合同')
  assert.equal(tree[0].kind, 'dir')
  const file = tree[0].children?.[0].children?.[0]
  assert.equal(file?.name, 'a.md')
  await assert.rejects(() => deleteEntry(root, base.id, '合同/2024/a.md', false), KbError)
  await deleteEntry(root, base.id, '合同/2024', true)
  await assert.rejects(() => readEntry(root, base.id, '合同/2024/a.md'), /不存在/)
  await rm(root, { recursive: true, force: true })
})

test('updateBase 缺库拒绝；listTree 缺库拒绝', async () => {
  const root = await sandbox()
  await assert.rejects(() => updateBase(root, 'ghost', { title: 'x' }), /不存在/)
  await assert.rejects(() => listTree(root, 'ghost'), /不存在/)
  await rm(root, { recursive: true, force: true })
})

test('导入路径不调 createBase：缺库报错', async () => {
  const root = await sandbox()
  const src = join(root, 'src.md')
  await writeFile(src, 'hello')
  await assert.rejects(() => ingest(root, {
    baseId: 'life',
    sourcePath: src,
    destCategory: '合同/2024',
  }), /先建库/)
  await rm(root, { recursive: true, force: true })
})

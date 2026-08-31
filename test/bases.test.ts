import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase, deleteBase, listBases, updateBase } from '../src/bases.ts'
import { ingest } from '../src/ingest.ts'
import { KbError } from '../src/types.ts'

async function sandbox(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zy-base-'))
}

test('createBase 写入目录和 catalog，不建默认类目', async () => {
  const root = await sandbox()
  const card = await createBase(root, {
    id: 'work',
    title: '工作库',
    description: '公司合同、会议纪要、供应商往来。问条款、纪要、交付开这个库。个人账单、家庭、医疗不要放。',
    aliases: ['工作', '公司', ' 工作 '],
  })
  assert.equal(card.id, 'work')
  assert.deepEqual(card.aliases, ['工作', '公司'])
  const listed = await listBases(root)
  assert.equal(listed.length, 1)
  assert.equal(listed[0].approxDocs, 0)
  assert.deepEqual(listed[0].categories, [])
  await rm(root, { recursive: true, force: true })
})

test('id 重复拒绝；非法 id 拒绝；缺描述拒绝', async () => {
  const root = await sandbox()
  await createBase(root, { id: 'work', title: '工作库', description: '描述' })
  await assert.rejects(() => createBase(root, { id: 'work', title: '二', description: '描述' }), KbError)
  await assert.rejects(() => createBase(root, { id: 'Work', title: 'x', description: '描述' }), KbError)
  await assert.rejects(() => createBase(root, { id: 'life', title: '生活', description: '' }), KbError)
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
  await createBase(root, { id: 'work', title: '工作库', description: '描述' })
  const updated = await updateBase(root, 'work', { title: '公司库' })
  assert.equal(updated.id, 'work')
  assert.equal(updated.title, '公司库')
  await assert.rejects(() => deleteBase(root, 'work', false), KbError)
  await deleteBase(root, 'work', true)
  assert.equal((await listBases(root)).length, 0)
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

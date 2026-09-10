import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { KbError } from '../src/model/error/kb-error.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from '../src/service/kb/knowledge-services.ts'

const knowledgeServices = createKnowledgeServices(new FileCatalogRepository())
const {
  createKb,
  deleteKb,
  deleteEntry,
  importFiles,
  listKbs,
  listTree,
  readEntry,
  updateKb,
  writeEntryContent,
} = knowledgeServices

async function sandbox(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zy-kb-'))
}

test('createKb 写入目录和 catalog，不建默认类目', async () => {
  const root = await sandbox()
  const card = await createKb(root, {
    title: '工作库',
    description: '公司合同、会议纪要、供应商往来。问条款、纪要、交付开这个库。个人账单、家庭、医疗不要放。',
    aliases: ['工作', '公司', ' 工作 '],
  })
  assert.match(card.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.deepEqual(card.aliases, ['工作', '公司'])
  const listed = await listKbs(root)
  assert.equal(listed.length, 1)
  assert.equal(listed[0].id, card.id)
  assert.equal(listed[0].approxDocs, 0)
  assert.deepEqual(listed[0].categories, [])
  await rm(root, { recursive: true, force: true })
})

test('标题不能重复；标题和描述不能为空', async () => {
  const root = await sandbox()
  const first = await createKb(root, { title: '工作库', description: '描述' })
  await assert.rejects(() => createKb(root, { title: '工作库', description: '描述' }), /标题.*已存在/)
  await assert.rejects(() => createKb(root, { title: '  工作库  ', description: '描述' }), /标题.*已存在/)
  await assert.rejects(() => createKb(root, { title: '生活', description: '' }), KbError)
  const second = await createKb(root, { title: '生活', description: '描述' })
  await assert.rejects(() => updateKb(root, second.id, { title: first.title }), /标题.*已存在/)
  await rm(root, { recursive: true, force: true })
})

test('无 catalog 也能扫 kbs/；无卡片时描述为空', async () => {
  const root = await sandbox()
  await mkdir(join(root, 'kbs', 'life'), { recursive: true })
  const listed = await listKbs(root)
  assert.equal(listed[0].id, 'life')
  assert.equal(listed[0].description, '')
  await rm(root, { recursive: true, force: true })
})

test('updateKb 不能改 id；deleteKb 需确认', async () => {
  const root = await sandbox()
  const created = await createKb(root, { title: '工作库', description: '描述' })
  const updated = await updateKb(root, created.id, { title: '公司库' })
  assert.equal(updated.id, created.id)
  assert.equal(updated.title, '公司库')
  await assert.rejects(() => deleteKb(root, created.id, false), KbError)
  await deleteKb(root, created.id, true)
  assert.equal((await listKbs(root)).length, 0)
  await rm(root, { recursive: true, force: true })
})

test('deleteKb 只删除已知的 kbs 直接子目录', async () => {
  const root = await sandbox()
  const outside = join(root, 'outside')
  await mkdir(outside)
  await writeFile(join(outside, 'keep.md'), '不能删除')
  await assert.rejects(
    () => deleteKb(root, '../outside', true),
    (error: unknown) => error instanceof KbError && error.code === 'kb_missing',
  )
  assert.equal(await readFile(join(outside, 'keep.md'), 'utf8'), '不能删除')
  await rm(root, { recursive: true, force: true })
})

test('write/read/deleteEntry 与 listTree；删除需确认', async () => {
  const root = await sandbox()
  const kb = await createKb(root, { title: '工作库', description: '描述' })
  await writeEntryContent(root, kb.id, '合同/2024/a.md', { kind: 'text', text: 'hello' })
  assert.deepEqual(await readEntry(root, kb.id, '合同/2024/a.md'), {
    path: '合同/2024/a.md',
    kind: 'text',
    text: 'hello',
    format: 'markdown',
    view: 'tree',
    windowStartLine: 1,
    windowEndLine: 1,
    truncation: 'none',
    totalChars: 5,
    previewStatus: 'ready',
  })
  const tree = await listTree(root, kb.id)
  assert.equal(tree[0].name, '合同')
  assert.equal(tree[0].kind, 'dir')
  const file = tree[0].children?.[0].children?.[0]
  assert.equal(file?.name, 'a.md')
  await assert.rejects(() => deleteEntry(root, kb.id, '合同/2024/a.md', false), KbError)
  await deleteEntry(root, kb.id, '合同/2024', true)
  await assert.rejects(() => readEntry(root, kb.id, '合同/2024/a.md'), /不存在/)
  await rm(root, { recursive: true, force: true })
})

test('updateKb 缺库拒绝；listTree 缺库拒绝', async () => {
  const root = await sandbox()
  await assert.rejects(() => updateKb(root, 'ghost', { title: 'x' }), /不存在/)
  await assert.rejects(() => listTree(root, 'ghost'), /不存在/)
  await rm(root, { recursive: true, force: true })
})

test('导入路径不调 createKb：缺库报错', async () => {
  const root = await sandbox()
  const src = join(root, 'src.md')
  await writeFile(src, 'hello')
  await assert.rejects(() => importFiles(root, {
    kbId: 'life',
    sourcePath: src,
    destCategory: '合同/2024',
  }), /先建库/)
  await rm(root, { recursive: true, force: true })
})

test('writeEntryContent 遇到逃出库根的符号链接会拒绝', async () => {
  const root = await sandbox()
  const kb = await createKb(root, { title: '工作库', description: '描述' })
  const outside = join(root, 'outside')
  await mkdir(outside)
  await symlink(outside, join(root, 'kbs', kb.id, 'linked'))
  await assert.rejects(
    () => writeEntryContent(root, kb.id, 'linked/escape.md', { kind: 'text', text: '不能写出库根' }),
    (error: unknown) => error instanceof KbError && error.code === 'path_escape',
  )
  assert.equal(await readFile(join(outside, 'escape.md')).then(() => true, () => false), false)
  await rm(root, { recursive: true, force: true })
})

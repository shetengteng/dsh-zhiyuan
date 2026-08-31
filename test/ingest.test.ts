import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase } from '../src/bases.ts'
import { ingest } from '../src/ingest.ts'
import { KbError } from '../src/types.ts'

async function ready() {
  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-ing-')))
  await createBase(root, { id: 'work', title: '工作库', description: '公司合同' })
  return root
}

test('指定 合同/2024 不存在则创建再拷；源文件不被改', async () => {
  const root = await ready()
  const src = join(root, '供应商合同.md')
  const body = '若乙方违约，甲方可解除合同并收取违约金。\ntermination 条款见附件三。\n'
  await writeFile(src, body)
  const result = await ingest(root, { baseId: 'work', sourcePath: src, destCategory: '合同/2024' })
  const dest = join(root, 'bases', 'work', '合同', '2024', '供应商合同.md')
  assert.equal(existsSync(dest), true)
  assert.equal(await readFile(dest, 'utf8'), body)
  assert.equal(await readFile(src, 'utf8'), body)
  assert.ok(result.createdDirs.includes('合同/2024'))
  await rm(root, { recursive: true, force: true })
})

test('destCategory=../life 拒绝，无文件写出', async () => {
  const root = await ready()
  const src = join(root, 'a.md')
  await writeFile(src, 'x')
  await assert.rejects(() => ingest(root, { baseId: 'work', sourcePath: src, destCategory: '../life' }), KbError)
  assert.equal(existsSync(join(root, 'bases', 'life')), false)
  await rm(root, { recursive: true, force: true })
})

test('同指纹 skip；同名不同指纹改名', async () => {
  const root = await ready()
  const src = join(root, 'a.md')
  await writeFile(src, 'same')
  await ingest(root, { baseId: 'work', sourcePath: src, destCategory: '' })
  const again = await ingest(root, { baseId: 'work', sourcePath: src, destCategory: '' })
  assert.equal(again.skipped, 1)
  const other = join(root, 'b', 'a.md')
  await mkdir(join(root, 'b'), { recursive: true })
  await writeFile(other, 'different')
  const renamed = await ingest(root, { baseId: 'work', sourcePath: other, destCategory: '' })
  assert.ok(renamed.renamed.includes('a-2.md'))
  await rm(root, { recursive: true, force: true })
})

test('单文件超过 5MB 该文件失败', async () => {
  const root = await ready()
  const big = join(root, 'big.md')
  await writeFile(big, 'x'.repeat(5_242_881))
  const small = join(root, 'ok.md')
  await writeFile(small, 'ok')
  const dir = join(root, 'batch')
  await mkdir(dir)
  await import('node:fs/promises').then((fs) => fs.copyFile(big, join(dir, 'big.md')))
  await import('node:fs/promises').then((fs) => fs.copyFile(small, join(dir, 'ok.md')))
  const result = await ingest(root, { baseId: 'work', sourcePath: dir, destCategory: '' })
  assert.equal(result.failed, 1)
  assert.equal(result.copied.includes('ok.md'), true)
  await rm(root, { recursive: true, force: true })
})

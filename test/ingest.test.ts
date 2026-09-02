import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase } from '../src/bases.ts'
import { lastDestCategory } from '../src/catalog.ts'
import { resolveIngestTo } from '../src/commands.ts'
import { ingest } from '../src/ingest.ts'
import { KbError } from '../src/types.ts'

async function ready() {
  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-ing-')))
  const base = await createBase(root, { title: '工作库', description: '公司合同' })
  return { root, baseId: base.id }
}

test('指定 合同/2024 不存在则创建再拷；源文件不被改', async () => {
  const { root, baseId } = await ready()
  const src = join(root, '供应商合同.md')
  const body = '若乙方违约，甲方可解除合同并收取违约金。\ntermination 条款见附件三。\n'
  await writeFile(src, body)
  const result = await ingest(root, { baseId, sourcePath: src, destCategory: '合同/2024' })
  const dest = join(root, 'bases', baseId, '合同', '2024', '供应商合同.md')
  assert.equal(existsSync(dest), true)
  assert.equal(await readFile(dest, 'utf8'), body)
  assert.equal(await readFile(src, 'utf8'), body)
  assert.ok(result.createdDirs.includes('合同/2024'))
  assert.equal(await lastDestCategory(root, baseId), '合同/2024')
  await rm(root, { recursive: true, force: true })
})

test('destCategory=../life 拒绝，无文件写出', async () => {
  const { root, baseId } = await ready()
  const src = join(root, 'a.md')
  await writeFile(src, 'x')
  await assert.rejects(() => ingest(root, { baseId, sourcePath: src, destCategory: '../life' }), KbError)
  assert.equal(existsSync(join(root, 'bases', 'life')), false)
  await rm(root, { recursive: true, force: true })
})

test('同指纹 skip；同名不同指纹改名', async () => {
  const { root, baseId } = await ready()
  const src = join(root, 'a.md')
  await writeFile(src, 'same')
  await ingest(root, { baseId, sourcePath: src, destCategory: '' })
  const again = await ingest(root, { baseId, sourcePath: src, destCategory: '' })
  assert.equal(again.skipped, 1)
  const other = join(root, 'b', 'a.md')
  await mkdir(join(root, 'b'), { recursive: true })
  await writeFile(other, 'different')
  const renamed = await ingest(root, { baseId, sourcePath: other, destCategory: '' })
  assert.ok(renamed.renamed.includes('a-2.md'))
  await rm(root, { recursive: true, force: true })
})

test('preserveTree 保留相对目录；createMissing=false 类目不存在则整批失败', async () => {
  const { root, baseId } = await ready()
  const dir = join(root, 'src', '子')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'a.md'), 'tree')
  const kept = await ingest(root, {
    baseId,
    sourcePath: join(root, 'src'),
    destCategory: '归档',
    preserveTree: true,
  })
  assert.ok(kept.copied.includes('归档/子/a.md'))
  await assert.rejects(() => ingest(root, {
    baseId,
    sourcePath: join(dir, 'a.md'),
    destCategory: '尚不存在',
    createMissing: false,
  }), /类目不存在/)
  await rm(root, { recursive: true, force: true })
})

test('非白名单后缀失败；源路径不存在失败', async () => {
  const { root, baseId } = await ready()
  const pdf = join(root, 'a.pdf')
  await writeFile(pdf, 'x')
  const denied = await ingest(root, { baseId, sourcePath: pdf, destCategory: '' })
  assert.equal(denied.failed, 1)
  assert.equal(denied.files[0].reason?.includes('.md'), true)
  await assert.rejects(() => ingest(root, {
    baseId,
    sourcePath: join(root, 'missing.md'),
    destCategory: '',
  }), /源路径不存在/)
  await assert.rejects(() => ingest(root, {
    baseId,
    sourcePath: '20260607-02-Memex-popup转桌面-TODO.md',
    destCategory: '',
  }), /导入弹框中的拖拽区域/)
  await rm(root, { recursive: true, force: true })
})

test('单文件超过 5MB 该文件失败', async () => {
  const { root, baseId } = await ready()
  const big = join(root, 'big.md')
  await writeFile(big, 'x'.repeat(5_242_881))
  const small = join(root, 'ok.md')
  await writeFile(small, 'ok')
  const dir = join(root, 'batch')
  await mkdir(dir)
  await import('node:fs/promises').then((fs) => fs.copyFile(big, join(dir, 'big.md')))
  await import('node:fs/promises').then((fs) => fs.copyFile(small, join(dir, 'ok.md')))
  const result = await ingest(root, { baseId, sourcePath: dir, destCategory: '' })
  assert.equal(result.failed, 1)
  assert.equal(result.copied.includes('ok.md'), true)
  await rm(root, { recursive: true, force: true })
})

test('类目深度超过 4 仍写入并提示', async () => {
  const { root, baseId } = await ready()
  const src = join(root, 'a.md')
  await writeFile(src, 'x')
  const result = await ingest(root, { baseId, sourcePath: src, destCategory: 'a/b/c/d/e' })
  assert.ok(result.warnings.some((item) => item.includes('深度')))
  assert.equal(existsSync(join(root, 'bases', baseId, 'a', 'b', 'c', 'd', 'e', 'a.md')), true)
  await rm(root, { recursive: true, force: true })
})

test('缺 --to 复用上次类目；没有上次则报错', async () => {
  const { root, baseId } = await ready()
  const src = join(root, 'a.md')
  await writeFile(src, 'x')
  await assert.rejects(() => resolveIngestTo(root, baseId, undefined, false), KbError)
  await ingest(root, { baseId, sourcePath: src, destCategory: '合同/2024' })
  assert.equal(await resolveIngestTo(root, baseId, undefined, false), '合同/2024')
  assert.equal(await resolveIngestTo(root, baseId, undefined, true), '')
  assert.equal(await resolveIngestTo(root, baseId, '会议', false), '会议')
  await rm(root, { recursive: true, force: true })
})

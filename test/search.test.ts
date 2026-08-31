import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase } from '../src/bases.ts'
import { diversify, mergeTerms, searchBase } from '../src/search.ts'
import type { SearchHit } from '../src/types.ts'
import { KbError } from '../src/types.ts'

test('aliases 超过 8 截断并警告', () => {
  const { terms, warnings } = mergeTerms('违约', Array.from({ length: 12 }, (_, i) => `词${i}`))
  assert.equal(terms.length, 8)
  assert.ok(warnings[0]?.includes('截断'))
})

test('空库搜索 → 空列表', async () => {
  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-se-')))
  await createBase(root, { id: 'work', title: '工作库', description: '描述' })
  const result = await searchBase(root, { baseId: 'work', query: '违约' })
  assert.deepEqual(result.hits, [])
  await rm(root, { recursive: true, force: true })
})

test('不带 baseId 失败', async () => {
  await assert.rejects(() => searchBase('/tmp', { baseId: '', query: '违约' }), KbError)
})

test('一次多词、截段、打散同一篇', async () => {
  const packed: Array<SearchHit & { file: string }> = []
  for (let i = 1; i <= 6; i += 1) {
    packed.push({ n: 0, file: '合同/2024/供应商合同.md', path: '合同/2024/供应商合同.md', startLine: i * 10, endLine: i * 10 + 8, excerpt: `段${i}` })
  }
  packed.push({ n: 0, file: '会议/纪要.md', path: '会议/纪要.md', startLine: 2, endLine: 10, excerpt: '会议' })
  const hits = diversify(packed, 4)
  assert.equal(hits.length, 4)
  assert.equal(hits[0].n, 1)
  assert.ok(new Set(hits.map((hit) => hit.path)).size >= 2)

  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-se2-')))
  await createBase(root, { id: 'work', title: '工作库', description: '描述' })
  await mkdir(join(root, 'bases', 'work', '合同', '2024'), { recursive: true })
  await mkdir(join(root, 'bases', 'work', '会议'), { recursive: true })
  const body = [
    '供应商合同',
    ...Array.from({ length: 20 }, () => '前文'),
    '若乙方违约，甲方可解除合同并收取违约金。',
    'termination 条款见附件三。',
    '解约需书面通知。',
  ].join('\n')
  await writeFile(join(root, 'bases', 'work', '合同', '2024', '供应商合同.md'), body)
  await writeFile(join(root, 'bases', 'work', '会议', '纪要.md'), '周会纪要，无合同条款。\n')
  const result = await searchBase(root, {
    baseId: 'work',
    query: '违约',
    aliases: ['解约', 'termination'],
    category: '合同/2024',
  })
  assert.ok(result.hits.length >= 1)
  assert.ok(result.hits.every((hit) => hit.path.includes('供应商合同')))
  assert.ok(result.hits[0].excerpt.includes('违约') || result.hits[0].excerpt.includes('termination'))
  await rm(root, { recursive: true, force: true })
})

import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase } from '../src/bases.ts'
import { matchedExcerptLine, parseLabeledFields, queryTerms } from '../src/client/search-utils.ts'
import { diversify, mergeTerms, searchBase } from '../src/search.ts'
import type { SearchHit } from '../src/types.ts'
import { KbError } from '../src/types.ts'

test('aliases 超过 8 截断并警告', () => {
  const { terms, warnings } = mergeTerms('违约', Array.from({ length: 12 }, (_, i) => `词${i}`))
  assert.equal(terms.length, 9)
  assert.equal(terms[0], '违约')
  assert.ok(warnings[0]?.includes('截断'))
})

test('命中展示使用实际命中行，而不是上下文第一行', () => {
  assert.equal(matchedExcerptLine({
    n: 1,
    path: 'README.md',
    startLine: 149,
    endLine: 165,
    matchLine: 157,
    excerpt: [
      '上下文第一行',
      '上下文第 2 行',
      '上下文第 3 行',
      '上下文第 4 行',
      '上下文第 5 行',
      '上下文第 6 行',
      '上下文第 7 行',
      '上下文第 8 行',
      '命中的 shadcn 行',
      '上下文第 10 行',
      '上下文第 11 行',
      '上下文第 12 行',
      '上下文第 13 行',
      '上下文第 14 行',
      '上下文第 15 行',
      '上下文第 16 行',
      '上下文最后一行',
    ].join('\n'),
  }), '命中的 shadcn 行')
})

test('命中展示优先使用格式模块给出的 matchedExcerpt', () => {
  assert.equal(matchedExcerptLine({
    n: 1,
    path: 'table.csv',
    startLine: 2,
    endLine: 3,
    matchLine: 3,
    excerpt: '列: 名称 | 金额\n名称: 甲公司 | 金额: 120\n名称: 乙公司 | 金额: 80',
    matchedExcerpt: '名称: 乙公司 | 金额: 80',
  }), '名称: 乙公司 | 金额: 80')
})

test('CSV 列名摘录拆成字段，表头行保持原文', () => {
  assert.deepEqual(parseLabeledFields('名称: 甲公司 | 金额: 120'), [
    { label: '名称', value: '甲公司' },
    { label: '金额', value: '120' },
  ])
  assert.equal(parseLabeledFields('列: 供应商 | 品类 | 金额'), null)
  assert.equal(parseLabeledFields('若乙方违约，甲方可解除合同'), null)
})

test('搜索关键词按空白拆开并去重', () => {
  assert.deepEqual(queryTerms('  违约  条款 违约 '), ['违约', '条款'])
  assert.deepEqual(queryTerms('   '), [])
})

test('空库搜索 → 空列表', async () => {
  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-se-')))
  const base = await createBase(root, { title: '工作库', description: '描述' })
  const result = await searchBase(root, { baseId: base.id, query: '违约' })
  assert.deepEqual(result.hits, [])
  await rm(root, { recursive: true, force: true })
})

test('不带 baseId 失败；空 query 失败', async () => {
  await assert.rejects(() => searchBase('/tmp', { baseId: '', query: '违约' }), KbError)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '  ' }), /query 必填/)
})

test('一次多词、截段、打散同一篇', async () => {
  const packed: Array<SearchHit & { file: string }> = []
  for (let i = 1; i <= 6; i += 1) {
    packed.push({ n: 0, file: '合同/2024/供应商合同.md', path: '合同/2024/供应商合同.md', startLine: i * 10, endLine: i * 10 + 8, matchLine: i * 10, excerpt: `段${i}` })
  }
  packed.push({ n: 0, file: '会议/纪要.md', path: '会议/纪要.md', startLine: 2, endLine: 10, matchLine: 2, excerpt: '会议' })
  const hits = diversify(packed, 4)
  assert.equal(hits.length, 4)
  assert.equal(hits[0].n, 1)
  assert.ok(new Set(hits.map((hit) => hit.path)).size >= 2)

  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-se2-')))
  const base = await createBase(root, { title: '工作库', description: '描述' })
  await mkdir(join(root, 'bases', base.id, '合同', '2024'), { recursive: true })
  await mkdir(join(root, 'bases', base.id, '会议'), { recursive: true })
  const body = [
    '供应商合同',
    ...Array.from({ length: 20 }, () => '前文'),
    '若乙方违约，甲方可解除合同并收取违约金。',
    'termination 条款见附件三。',
    '解约需书面通知。',
  ].join('\n')
  await writeFile(join(root, 'bases', base.id, '合同', '2024', '供应商合同.md'), body)
  await writeFile(join(root, 'bases', base.id, '会议', '纪要.md'), '周会纪要，无合同条款。\n')
  const result = await searchBase(root, {
    baseId: base.id,
    query: '违约',
    aliases: ['解约', 'termination'],
    category: '合同/2024',
  })
  assert.ok(result.hits.length >= 1)
  assert.ok(result.hits.every((hit) => hit.path.includes('供应商合同')))
  const hit = result.hits[0]
  assert.ok(hit.excerpt.includes('违约') || hit.excerpt.includes('termination'))
  assert.ok(hit.matchLine >= hit.startLine && hit.matchLine <= hit.endLine)
  assert.match(hit.excerpt.split('\n')[hit.matchLine - hit.startLine] ?? '', /违约|termination|解约/)
  assert.equal(hit.excerpt.split('\n').length, hit.endLine - hit.startLine + 1)
  assert.equal('documents' in result, false)
  await rm(root, { recursive: true, force: true })
})

test('类目对不上则本库全扫；mergeTerms 去重', async () => {
  const { terms } = mergeTerms('违约', ['违约', ' 解约 ', ''])
  assert.deepEqual(terms, ['违约', '解约'])

  const root = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(tmpdir(), 'zy-se3-')))
  const base = await createBase(root, { title: '工作库', description: '描述' })
  await mkdir(join(root, 'bases', base.id, '会议'), { recursive: true })
  await writeFile(join(root, 'bases', base.id, '会议', '纪要.md'), '违约金条款。\n')
  const result = await searchBase(root, { baseId: base.id, query: '违约', category: '没有这个类目' })
  assert.ok(result.hits.some((hit) => hit.path.includes('纪要')))
  await rm(root, { recursive: true, force: true })
})

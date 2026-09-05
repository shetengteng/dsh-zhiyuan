import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase } from '../src/bases.ts'
import { matchedExcerptLine, parseLabeledFields, queryTerms } from '../src/client/search-utils.ts'
import { canMergeWindows, groupMatchesByFile, prefixRawCounts, restFileList } from '../src/search-groups.ts'
import { mergeTerms, searchBase } from '../src/search.ts'
import type { SearchResult } from '../src/types.ts'
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
    excerpt: '名称: 甲公司 | 金额: 120\n名称: 乙公司 | 金额: 80',
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

test('groupMatchesByFile 组间按命中数降序、同数字典序，组内按行号升序', () => {
  const groups = groupMatchesByFile([
    { path: 'b.md', line: 5, columnByte: 1 },
    { path: 'a.md', line: 9, columnByte: 1 },
    { path: 'c.md', line: 3, columnByte: 1 },
    { path: 'a.md', line: 2, columnByte: 1 },
    { path: 'c.md', line: 8, columnByte: 1 },
  ])
  assert.deepEqual(groups.map((group) => group.path), ['a.md', 'c.md', 'b.md'])
  assert.deepEqual(groups[0].matches.map((match) => match.line), [2, 9])
  assert.deepEqual(prefixRawCounts(groups), [0, 2, 4])
})

test('canMergeWindows 只在重叠或（允许相邻时）差一行才合并', () => {
  assert.equal(canMergeWindows({ startLine: 1, endLine: 5 }, { startLine: 6, endLine: 10 }, false), false)
  assert.equal(canMergeWindows({ startLine: 1, endLine: 5 }, { startLine: 6, endLine: 10 }, true), true)
  assert.equal(canMergeWindows({ startLine: 1, endLine: 5 }, { startLine: 5, endLine: 9 }, false), true)
})

test('restFileList 跳过本页已触碰的组并截断到 limit', () => {
  const groups = groupMatchesByFile([
    { path: 'a.md', line: 1, columnByte: 1 },
    { path: 'b.md', line: 1, columnByte: 1 },
    { path: 'c.md', line: 1, columnByte: 1 },
    { path: 'd.md', line: 1, columnByte: 1 },
    { path: 'e.md', line: 1, columnByte: 1 },
  ])
  assert.deepEqual(restFileList(groups, 1, 2), [{ path: 'c.md', count: 1 }, { path: 'd.md', count: 1 }])
  assert.deepEqual(restFileList(groups, -1, 8).map((item) => item.path), ['a.md', 'b.md', 'c.md', 'd.md', 'e.md'])
})

test('空库搜索 → 空结果', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-se-'))
  try {
    const base = await createBase(root, { title: '工作库', description: '描述' })
    const result = await searchBase(root, { baseId: base.id, query: '违约' })
    assert.deepEqual(result.files, [])
    assert.equal(result.totalFiles, 0)
    assert.equal(result.totalHits, 0)
    assert.equal(result.hasMore, false)
    assert.equal(result.nextCursor, undefined)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('不带 baseId 失败；空 query 失败', async () => {
  await assert.rejects(() => searchBase('/tmp', { baseId: '', query: '违约' }), KbError)
  await assert.rejects(() => searchBase('/tmp', { baseId: 'work', query: '  ' }), /query 必填/)
})

/** 建临时库并在 bases/<id>/ 下写文件，结束后清理。 */
async function withBase(prefix: string, files: Record<string, string>, work: (root: string, baseId: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), prefix))
  try {
    const base = await createBase(root, { title: '工作库', description: '描述' })
    for (const [relativePath, body] of Object.entries(files)) {
      const target = join(root, 'bases', base.id, relativePath)
      await mkdirp(target.slice(0, target.lastIndexOf('/')))
      await writeFile(target, body)
    }
    await work(root, base.id)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

async function mkdirp(path: string): Promise<void> {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(path, { recursive: true })
}

/** 按游标翻完所有页，收集每页结果。 */
async function searchAllPages(root: string, baseId: string, query: string, extra: Record<string, string> = {}): Promise<SearchResult[]> {
  const pages: SearchResult[] = []
  let cursor: string | undefined
  do {
    const page = await searchBase(root, { baseId, query, ...(cursor ? { cursor } : {}), ...extra })
    pages.push(page)
    cursor = page.nextCursor
    if (pages.length > 50) throw new Error('翻页超过 50 页，疑似死循环')
  } while (cursor)
  return pages
}

/** 不变式：本页未消费完剩余命中的组只能是页内最后一个组。需要跨页累计命中数区分「续读组」与「截断组」。 */
function assertTruncatedGroupIsLast(pages: SearchResult[]): void {
  const cumulative = new Map<string, number>()
  for (const page of pages) {
    for (let index = 0; index < page.files.length; index += 1) {
      const group = page.files[index]
      cumulative.set(group.path, (cumulative.get(group.path) ?? 0) + group.hits.length)
      const isLastGroup = index === page.files.length - 1
      if (!isLastGroup || !page.hasMore) {
        assert.equal(cumulative.get(group.path), group.totalHits, '非末组（或最后一页的组）必须已消费该文件全部命中')
      }
    }
  }
}

test('文件组分页：一页不跨文件、组内截断、续页编号连续、概览正确', async () => {
  const matchLine = (index: number) => `违约条款${index}：` + '很长的内容'.repeat(60)
  const bigLines: string[] = []
  for (let index = 0; index < 12; index += 1) {
    // 每个命中行间隔 6 行，避免列表档 ±2 窗口重叠
    bigLines.push('填充', '填充', '填充', '填充', '填充', matchLine(index))
  }
  await withBase('zy-group-', {
    'big.md': `${bigLines.join('\n')}\n`,
    'small.md': '只有一条违约命中。\n',
  }, async (root, baseId) => {
    const first = await searchBase(root, { baseId, query: '违约' })
    assert.equal(first.totalFiles, 2)
    assert.equal(first.totalHits, 13)
    assert.equal(first.files.length, 1, '预算内装不下的组整组顺延，第一页只有 big.md')
    assert.equal(first.files[0].path, 'big.md')
    assert.ok(first.files[0].hits.length >= 1 && first.files[0].hits.length < 12, 'big.md 在第一页被截断')
    assert.equal(first.hasMore, true)
    assert.deepEqual(first.restFiles, [{ path: 'small.md', count: 1 }])
    assertTruncatedGroupIsLast([first])

    const pages = await searchAllPages(root, baseId, '违约')
    const allHits = pages.flatMap((page) => page.files.flatMap((group) => group.hits))
    assert.equal(allHits.length, 13, '多页合计 12 条 big + 1 条 small')
    assert.deepEqual(allHits.map((hit) => hit.n), Array.from({ length: 13 }, (_, index) => index + 1), '全局编号跨页连续')
    const matchLines = allHits.filter((hit) => hit.path === 'big.md').map((hit) => hit.matchLine)
    assert.equal(new Set(matchLines).size, 12, '翻页不重复、不遗漏')
    const lastPage = pages[pages.length - 1]
    assert.ok(lastPage, '应有最后一页')
    assert.equal(lastPage?.hasMore, false)
    assert.equal(lastPage?.nextCursor, undefined)
    assert.ok(lastPage?.files.some((group) => group.path === 'small.md'), '最后一页包含 small.md')
    assertTruncatedGroupIsLast(pages)
  })
})

test('CSV 分页：表头只在组头出现一次，记录不带表头前缀', async () => {
  const rows = Array.from({ length: 12 }, (_, index) => `第${index + 1}条,重复值${'长'.repeat(400)}`)
  await withBase('zy-csv-page-', {
    'ledger.csv': `名称,状态\n${rows.join('\n')}\n`,
  }, async (root, baseId) => {
    const pages = await searchAllPages(root, baseId, '重复值')
    assert.ok(pages.length >= 2, '12 条宽记录按字符预算分成多页')
    assert.equal(pages[0].totalFiles, 1)
    assert.equal(pages[0].totalHits, 12)
    const allHits = pages.flatMap((page) => page.files.flatMap((group) => group.hits))
    assert.deepEqual(allHits.map((hit) => hit.n), Array.from({ length: 12 }, (_, index) => index + 1))
    for (const page of pages) {
      for (const group of page.files) {
        assert.equal(group.format, 'csv')
        assert.equal(group.groupHeader, '列: 名称 | 状态')
        for (const hit of group.hits) {
          assert.ok(!hit.excerpt.includes('列: '), '记录 excerpt 不再重复表头')
          assert.ok(hit.matchedExcerpt?.startsWith('名称: 第'), '命中记录保持「列名: 值」格式')
        }
      }
    }
    assertTruncatedGroupIsLast(pages)
  })
})

test('CSV 同一记录多行命中合并为一条', async () => {
  await withBase('zy-csv-merge-', {
    'notes.csv': '名称,备注\n甲,"第一行 违约\n第二行 违约"\n',
  }, async (root, baseId) => {
    const result = await searchBase(root, { baseId, query: '违约' })
    assert.equal(result.totalFiles, 1)
    assert.equal(result.totalHits, 2, 'rg 原始计数是 2')
    assert.equal(result.files[0].hits.length, 1, '同一记录合并为 1 条命中')
    assert.ok(result.files[0].hits[0].matchedExcerpt?.includes('第一行 违约'))
  })
})

test('一次多词 OR 与类目收窄；列表档 MD excerpt 是 ±2 行窗口', async () => {
  const body = [
    '供应商合同',
    ...Array.from({ length: 20 }, () => '前文'),
    '若乙方违约，甲方可解除合同并收取违约金。',
    'termination 条款见附件三。',
    '解约需书面通知。',
  ].join('\n')
  await withBase('zy-multi-', {
    '合同/2024/供应商合同.md': `${body}\n`,
    '会议/纪要.md': '周会纪要，无合同条款。\n',
  }, async (root, baseId) => {
    const result = await searchBase(root, {
      baseId,
      query: '违约',
      aliases: ['解约', 'termination'],
      category: '合同/2024',
    })
    assert.equal(result.totalFiles, 1)
    assert.ok(result.files[0].path.includes('供应商合同'))
    assert.ok(result.files[0].totalHits >= 3, '违约 / termination / 解约 各命中一次')
    const hit = result.files[0].hits[0]
    assert.ok(hit.excerpt.includes('违约') || hit.excerpt.includes('termination'))
    assert.ok(hit.matchLine >= hit.startLine && hit.matchLine <= hit.endLine)
    assert.equal(hit.excerpt.split('\n').length, hit.endLine - hit.startLine + 1)
  })
})

test('类目对不上则本库全扫；mergeTerms 去重', async () => {
  const { terms } = mergeTerms('违约', ['违约', ' 解约 ', ''])
  assert.deepEqual(terms, ['违约', '解约'])
  await withBase('zy-se3-', {
    '会议/纪要.md': '违约金条款。\n',
  }, async (root, baseId) => {
    const result = await searchBase(root, { baseId, query: '违约', category: '没有这个类目' })
    assert.ok(result.files.some((group) => group.path.includes('纪要')))
  })
})

test('游标失效：v1 结构、换词、跨档位都拒绝', async () => {
  // 两条长命中让首页只装得下第一条，从而产生 nextCursor
  const longHit = (label: string) => `${label}：` + '背景说明'.repeat(800)
  await withBase('zy-cursor-', {
    'a.md': `${longHit('违约第一处')}\n\n\n\n\n${longHit('违约第二处')}\n`,
  }, async (root, baseId) => {
    const legacyCursor = Buffer.from(JSON.stringify({ version: 1, offset: 3, queryKey: 'x' }), 'utf8').toString('base64url')
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', cursor: legacyCursor }),
      /搜索游标无效或已过期/,
    )

    const first = await searchBase(root, { baseId, query: '违约' })
    if (!first.nextCursor) throw new Error('缺少下一页游标')
    await assert.rejects(
      () => searchBase(root, { baseId, query: '解约', cursor: first.nextCursor }),
      /搜索游标无效或已过期/,
    )
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', path: 'a.md', cursor: first.nextCursor }),
      /搜索游标无效或已过期/,
    )
  })
})

test('path 明细档：锁定单文件、相邻合并成宽上下文', async () => {
  const detailLines: string[] = []
  for (let index = 0; index < 3; index += 1) {
    detailLines.push('填充', '填充', '填充', '填充', '填充', `违约明细${index}`)
  }
  await withBase('zy-detail-', {
    'detail.md': `${detailLines.join('\n')}\n`,
    'other.md': '这里也有违约。\n',
  }, async (root, baseId) => {
    const result = await searchBase(root, { baseId, query: '违约', path: 'detail.md' })
    assert.equal(result.totalFiles, 1)
    assert.equal(result.files.length, 1)
    assert.equal(result.files[0].path, 'detail.md')
    assert.equal(result.files[0].hits.length, 1, '明细档 ±8 窗口互相重叠，合并为一条')
    const hit = result.files[0].hits[0]
    assert.equal(hit.excerpt.split('\n').length, hit.endLine - hit.startLine + 1)
    assert.equal(hit.excerpt.split('违约明细').length - 1, 3, '三处命中都在同一条宽摘录里')
  })
})

test('path 无命中返回空结果；越界与绝对路径被拒绝', async () => {
  await withBase('zy-path-guard-', {
    'a.md': '违约一处。\n',
  }, async (root, baseId) => {
    const empty = await searchBase(root, { baseId, query: '违约', path: '没有这个文件.md' })
    assert.deepEqual(empty.files, [])
    assert.equal(empty.totalFiles, 0)

    await assert.rejects(() => searchBase(root, { baseId, query: '违约', path: '../outside.md' }), (error: unknown) => {
      return error instanceof KbError && error.code === 'path_escape'
    })
    await assert.rejects(
      () => searchBase(root, { baseId, query: '违约', path: '/etc/passwd' }),
      /path 必须是检索范围内的相对路径/,
    )
  })
})

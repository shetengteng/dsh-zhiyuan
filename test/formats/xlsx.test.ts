import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Catalog } from '../../src/model/entity/catalog.ts'
import { FileCatalogRepository } from '../../src/repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from '../../src/service/kb/knowledge-services.ts'
import type { SearchResult, SearchFileDetailResult } from '../../src/model/response/search-response.ts'
import type { SearchRequest } from '../../src/model/request/search-request.ts'
import type { SearchKbAccess } from '../../src/service/search/kb-access.ts'
import { searchKb as searchKbWithAccess } from '../../src/service/search/search-kb.ts'
import { buildXlsxWorkbook, formulaCell, inlineTextCell, numberCell, rowXml } from './xlsx-fixtures.ts'

const catalogRepository = new FileCatalogRepository()
const knowledgeServices = createKnowledgeServices(catalogRepository)
const {
  createKb,
  importFiles,
  markKbUsed,
  readEntryPage,
  requireKb,
  writeEntryContent,
} = knowledgeServices
const readCatalog = (dataRoot: string): Promise<Catalog> => catalogRepository.read(dataRoot)
const writeCatalog = (dataRoot: string, catalog: Catalog): Promise<void> => catalogRepository.save(dataRoot, catalog)

async function sandbox(prefix = 'zy-xlsx-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

function createSearchKbAccess(dataRoot: string): SearchKbAccess {
  return {
    ensureKb: (kbId) => requireKb(dataRoot, kbId),
    markKbUsed: (kbId) => markKbUsed(dataRoot, kbId),
  }
}

async function searchKb(dataRoot: string, input: SearchRequest): Promise<SearchResult> {
  return searchKbWithAccess(dataRoot, input, createSearchKbAccess(dataRoot))
}

async function searchFirstFile(root: string, kbId: string, query: string): Promise<SearchFileDetailResult> {
  const overview = await searchKb(root, { kbId, query })
  if (overview.kind !== 'overview') throw new Error('搜索初次请求应返回文件概览')
  const path = overview.files[0]?.path
  if (!path) throw new Error('搜索没有返回文件')
  const detail = await searchKb(root, { kbId, query, path })
  if (detail.kind !== 'file-detail') throw new Error('搜索文件请求应返回文件详情')
  return detail
}

function singleSheetWorkbook(): Buffer {
  return buildXlsxWorkbook([
    {
      name: 'Sheet1',
      rows: [
        rowXml(1, inlineTextCell('A1', '供应商') + inlineTextCell('B1', '金额')),
        rowXml(2, inlineTextCell('A2', '甲公司') + numberCell('B2', '120000')),
      ],
    },
  ])
}

test('单表 XLSX 转 CSV 后可搜索、可表格编辑、保存仍是规范 CSV', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '台账', description: 'XLSX 测试' })
    const source = join(root, '台账.xlsx')
    await writeFile(source, singleSheetWorkbook())

    const result = await importFiles(root, { kbId: kb.id, sourcePath: source, destCategory: '' })
    assert.deepEqual(result.copied, ['台账.csv'])
    assert.equal(result.failed, 0)

    const written = await readFile(join(root, 'kbs', kb.id, '台账.csv'))
    assert.deepEqual(written.subarray(0, 3), Buffer.from([0xef, 0xbb, 0xbf]))
    assert.equal(written.subarray(3).toString('utf8'), '供应商,金额\n甲公司,120000')

    const detail = await searchFirstFile(root, kb.id, '甲公司')
    assert.equal(detail.groupHeader, '列: 供应商 | 金额')
    const hit = detail.hits[0]
    assert.equal(hit?.excerpt, '供应商: 甲公司 | 金额: 120000')
    assert.equal(hit?.matchedExcerpt, '供应商: 甲公司 | 金额: 120000')

    const page = await readEntryPage(root, kb.id, '台账.csv', 1, 50)
    assert.equal(page.totalRows, 1)
    assert.deepEqual(page.rows[0], ['甲公司', '120000'])

    await writeEntryContent(root, kb.id, '台账.csv', { kind: 'text', text: '供应商,金额\n乙公司,"98,000"' })
    const edited = await readFile(join(root, 'kbs', kb.id, '台账.csv'))
    assert.equal(edited.subarray(3).toString('utf8'), '供应商,金额\n乙公司,"98,000"')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('多 sheet 每表一个 CSV 且独立可编辑；隐藏与空 sheet 跳过并记 warning', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '报表库', description: 'XLSX 测试' })
    const source = join(root, '报表.xlsx')
    await writeFile(source, buildXlsxWorkbook([
      {
        name: '台账',
        rows: [rowXml(1, inlineTextCell('A1', '甲') + numberCell('B1', '1'))],
      },
      {
        name: '秘密',
        state: 'hidden',
        rows: [rowXml(1, inlineTextCell('A1', '机密'))],
      },
      { name: '空白', rows: [] },
      {
        name: '明细/2024',
        rows: [
          rowXml(1, inlineTextCell('A1', '名称') + inlineTextCell('B1', '数量')),
          rowXml(2, inlineTextCell('A2', '乙') + numberCell('B2', '2')),
        ],
      },
    ]))

    const result = await importFiles(root, { kbId: kb.id, sourcePath: source, destCategory: '' })
    assert.deepEqual(result.copied, ['报表-台账.csv', '报表-明细2024.csv'])
    assert.match(result.warnings.join('\n'), /已跳过隐藏工作表：秘密/)
    assert.match(result.warnings.join('\n'), /已跳过空工作表：空白/)

    const page = await readEntryPage(root, kb.id, '报表-明细2024.csv', 1, 50)
    assert.deepEqual(page.rows[0], ['乙', '2'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('所有 sheet 都被隐藏时源级 skipped，不落盘', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '隐库', description: 'XLSX 测试' })
    const source = join(root, '机密.xlsx')
    await writeFile(source, buildXlsxWorkbook([
      {
        name: '秘密',
        state: 'veryHidden',
        rows: [rowXml(1, inlineTextCell('A1', '机密'))],
      },
    ]))

    const result = await importFiles(root, { kbId: kb.id, sourcePath: source, destCategory: '' })
    assert.equal(result.skipped, 1)
    assert.equal(result.copied.length, 0)
    const fileResult = result.files[0]
    assert.equal(fileResult?.status, 'skipped')
    assert.equal(fileResult?.reason, '工作簿没有可导入的工作表')
    assert.match(result.warnings.join('\n'), /已跳过隐藏工作表：秘密/)
    await assert.rejects(() => readFile(join(root, 'kbs', kb.id, '机密.csv')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('缺公式缓存整份失败；带缓存的公式取缓存值且前导零不被改写', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '公式库', description: 'XLSX 测试' })
    const badSource = join(root, '未计算.xlsx')
    await writeFile(badSource, buildXlsxWorkbook([
      {
        name: 'S',
        rows: [
          rowXml(1, numberCell('A1', '2') + numberCell('B1', '3')),
          rowXml(2, formulaCell('A2', 'A1*10')),
        ],
      },
    ]))
    const badResult = await importFiles(root, { kbId: kb.id, sourcePath: badSource, destCategory: '' })
    assert.equal(badResult.failed, 1)
    assert.equal(badResult.files[0]?.status, 'failed')
    assert.equal(badResult.files[0]?.code, 'xlsx_invalid')
    assert.match(badResult.files[0]?.reason ?? '', /重新计算/)
    await assert.rejects(() => readFile(join(root, 'kbs', kb.id, '未计算.csv')))

    const goodSource = join(root, '已计算.xlsx')
    await writeFile(goodSource, buildXlsxWorkbook([
      {
        name: 'S',
        rows: [
          rowXml(1, inlineTextCell('A1', '编号') + inlineTextCell('B1', '值')),
          rowXml(2, inlineTextCell('A2', '00123') + formulaCell('B2', 'A1*10', '20')),
        ],
      },
    ]))
    const goodResult = await importFiles(root, { kbId: kb.id, sourcePath: goodSource, destCategory: '' })
    assert.deepEqual(goodResult.copied, ['已计算.csv'])
    const written = await readFile(join(root, 'kbs', kb.id, '已计算.csv'))
    assert.equal(written.subarray(3).toString('utf8'), '编号,值\n00123,20')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('工作簿结构与声明范围超过上限时整份失败', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '上限库', description: 'XLSX 测试' })

    const tooManySheets = join(root, '超表.xlsx')
    await writeFile(tooManySheets, buildXlsxWorkbook(
      Array.from({ length: 33 }, (_, index) => ({
        name: `S${index + 1}`,
        rows: [rowXml(1, inlineTextCell('A1', 'x'))],
      })),
    ))
    const tooManyResult = await importFiles(root, { kbId: kb.id, sourcePath: tooManySheets, destCategory: '' })
    assert.equal(tooManyResult.files[0]?.code, 'xlsx_invalid')
    assert.match(tooManyResult.files[0]?.reason ?? '', /工作表数量超过上限/)

    const tooManyRows = join(root, '超行.xlsx')
    await writeFile(tooManyRows, buildXlsxWorkbook([
      { name: 'S', dimension: 'A1:A2001', rows: [rowXml(1, inlineTextCell('A1', 'x'))] },
    ]))
    const rowsResult = await importFiles(root, { kbId: kb.id, sourcePath: tooManyRows, destCategory: '' })
    assert.match(rowsResult.files[0]?.reason ?? '', /2001 行 × 1 列超过上限/)

    const tooManyCols = join(root, '超列.xlsx')
    await writeFile(tooManyCols, buildXlsxWorkbook([
      { name: 'S', dimension: 'A1:AO1', rows: [rowXml(1, inlineTextCell('A1', 'x'))] },
    ]))
    const colsResult = await importFiles(root, { kbId: kb.id, sourcePath: tooManyCols, destCategory: '' })
    assert.match(colsResult.files[0]?.reason ?? '', /1 行 × 41 列超过上限/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('隐藏行与隐藏列的数据不进库', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '隐藏库', description: 'XLSX 测试' })
    const source = join(root, '隐藏.xlsx')
    await writeFile(source, buildXlsxWorkbook([
      {
        name: 'S',
        cols: '<col min="2" max="2" hidden="1"/>',
        rows: [
          rowXml(1, inlineTextCell('A1', '可见头') + inlineTextCell('B1', '隐藏列值')),
          rowXml(2, inlineTextCell('A2', '隐藏行值') + inlineTextCell('B2', '双隐藏'), true),
          rowXml(3, inlineTextCell('A3', '可见值') + inlineTextCell('B3', '隐藏列值2')),
        ],
      },
    ]))

    const result = await importFiles(root, { kbId: kb.id, sourcePath: source, destCategory: '' })
    assert.deepEqual(result.copied, ['隐藏.csv'])
    const written = await readFile(join(root, 'kbs', kb.id, '隐藏.csv'))
    assert.equal(written.subarray(3).toString('utf8'), '可见头\n可见值')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('同指纹 skip；同名不同内容改名 name-2', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '冲突库', description: 'XLSX 测试' })
    const first = join(root, 'a')
    const second = join(root, 'b')
    await mkdir(first, { recursive: true })
    await mkdir(second, { recursive: true })
    const firstSource = join(first, '报表.xlsx')
    const secondSource = join(second, '报表.xlsx')
    await writeFile(firstSource, singleSheetWorkbook())
    await writeFile(secondSource, buildXlsxWorkbook([
      {
        name: 'Sheet1',
        rows: [rowXml(1, inlineTextCell('A1', '另一份') + numberCell('B1', '9'))],
      },
    ]))

    const firstResult = await importFiles(root, { kbId: kb.id, sourcePath: firstSource, destCategory: '' })
    assert.deepEqual(firstResult.copied, ['报表.csv'])
    // 同名不同内容 → 改名
    const conflictResult = await importFiles(root, { kbId: kb.id, sourcePath: secondSource, destCategory: '' })
    assert.deepEqual(conflictResult.copied, ['报表-2.csv'])
    // 同内容重复导入 → 指纹 skip
    const repeatResult = await importFiles(root, { kbId: kb.id, sourcePath: firstSource, destCategory: '' })
    assert.equal(repeatResult.skipped, 1)
    assert.equal(repeatResult.files[0]?.status, 'skipped')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('源体积与库配额超限时整份源失败且不落盘', async () => {
  const root = await sandbox()
  try {
    const kb = await createKb(root, { title: '配额库', description: 'XLSX 测试' })
    const catalog = await readCatalog(root)
    catalog.prefs = { ...catalog.prefs, maxFileBytes: 10 }
    await writeCatalog(root, catalog)
    const source = join(root, '台账.xlsx')
    await writeFile(source, singleSheetWorkbook())

    const tooLarge = await importFiles(root, { kbId: kb.id, sourcePath: source, destCategory: '' })
    assert.equal(tooLarge.failed, 1)
    assert.equal(tooLarge.files[0]?.code, 'file_too_large')

    catalog.prefs = { ...catalog.prefs, maxFileBytes: 10 * 1024 * 1024, maxKbBytes: 10 }
    await writeCatalog(root, catalog)
    const overQuota = await importFiles(root, { kbId: kb.id, sourcePath: source, destCategory: '' })
    assert.equal(overQuota.failed, 1)
    assert.equal(overQuota.files[0]?.code, 'quota')
    await assert.rejects(() => readFile(join(root, 'kbs', kb.id, '台账.csv')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase, readEntry, readEntryPage, writeEntryContent } from '../src/bases.ts'
import { readCatalog, writeCatalog } from '../src/catalog.ts'
import { CSV_MAX_PHYSICAL_LINE_BYTES } from '../src/identity.ts'
import { readValidatedUtf8Csv } from '../src/content/csv/server/encoding.ts'
import { decodeCsvBytes } from '../src/content/csv/server/decode.ts'
import { createCsvSearchDocument } from '../src/content/csv/server/search-excerpt.ts'
import { ingest } from '../src/ingest.ts'
import { searchBase } from '../src/search.ts'
import { encodeUtf8CsvWithBom } from '../src/content/shared/utf8.ts'
import { KbError } from '../src/types.ts'

async function sandbox(prefix = 'zy-csv-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

test('UTF-8 CSV 导入后写成 UTF-8 BOM、可搜索、表格预览和编辑', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '台账', description: 'CSV 测试' })
    const source = join(root, 'table.CSV')
    const raw = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('名称,金额\n甲公司,120\n', 'utf8')])
    await writeFile(source, raw)

    const result = await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    assert.deepEqual(result.copied, ['table.CSV'])
    assert.equal(result.files[0]?.sourceRelPath, 'table.CSV')
    assert.equal(result.files[0]?.writtenBytes, raw.length)
    assert.deepEqual(await readFile(join(root, 'bases', base.id, 'table.CSV')), raw)

    const search = await searchBase(root, { baseId: base.id, query: '公司' })
    const group = search.files[0]
    const hit = group?.hits[0]
    assert.equal(group?.path, 'table.CSV')
    assert.equal(group?.groupHeader, '列: 名称 | 金额')
    assert.equal(hit?.path, 'table.CSV')
    assert.equal(hit?.matchLine, 2)
    assert.equal(hit?.startLine, 2)
    assert.equal(hit?.endLine, 2)
    assert.equal(hit?.excerpt, '名称: 甲公司 | 金额: 120')
    assert.equal(hit?.matchedExcerpt, '名称: 甲公司 | 金额: 120')
    assert.equal(hit?.matchColumnByte, 4)
    assert.equal('documents' in search, false)

    const preview = await readEntry(root, base.id, 'table.CSV', {
      view: 'search-hit',
      matchLine: hit?.matchLine,
      matchColumnByte: hit?.matchColumnByte,
      sourceFingerprint: hit?.sourceFingerprint,
    })
    assert.equal(preview.format, 'csv')
    assert.equal(preview.kind, 'table')
    assert.equal(preview.previewStatus, 'ready')
    assert.equal(preview.focusLine, 2)
    assert.equal(preview.focusColumnByte, 4)
    assert.doesNotMatch(preview.text, /^\uFEFF/)
    const { revision, ...previewTable } = preview.table ?? {}
    assert.match(revision ?? '', /^[a-f0-9]{64}$/)
    assert.deepEqual(previewTable, {
      headers: ['名称', '金额'],
      rows: [['甲公司', '120']],
      totalRows: 1,
      windowStartRow: 1,
      windowEndRow: 1,
      complete: false,
      focusedRow: 1,
    })

    const editable = await readEntry(root, base.id, 'table.CSV', { view: 'tree', readMode: 'edit' })
    if (editable.kind !== 'table') throw new Error('CSV 编辑预览应为表格形态')
    assert.equal(editable.table?.complete, true)
    assert.match(editable.table?.revision ?? '', /^[a-f0-9]{64}$/)
    await writeEntryContent(root, base.id, 'table.CSV', { kind: 'text', text: '名称,金额\n乙公司,"98,000"' })
    const written = await readFile(join(root, 'bases', base.id, 'table.CSV'))
    assert.deepEqual(written.subarray(0, 3), Buffer.from([0xef, 0xbb, 0xbf]))
    assert.equal(written.subarray(3).toString('utf8'), '名称,金额\n乙公司,"98,000"')
    await assert.rejects(() => writeEntryContent(root, base.id, 'table.CSV', { kind: 'text', text: '名称,金额\n"未闭合' }), (error: unknown) => (
      error instanceof KbError && error.code === 'csv_parse_invalid'
    ))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 编辑器按页返回数据、只提交 patch，并拒绝过期或越界修改', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '分页', description: 'CSV 分页编辑测试' })
    const rows = Array.from({ length: 650 }, (_, index) => `原始${index + 1},${index + 1}`).join('\n')
    await writeEntryContent(root, base.id, 'large.csv', { kind: 'text', text: `名称,编号\n${rows}` })

    const readOnly = await readEntry(root, base.id, 'large.csv')
    if (readOnly.kind !== 'table') throw new Error('CSV 预览应为表格形态')
    assert.equal(readOnly.table?.rows.length, 500)
    assert.equal(readOnly.table?.totalRows, 650)
    assert.equal(readOnly.table?.complete, false)

    const initial = await readEntry(root, base.id, 'large.csv', { view: 'tree', readMode: 'edit' })
    if (initial.kind !== 'table') throw new Error('CSV 编辑预览应为表格形态')
    assert.equal(initial.table?.rows.length, 200)
    assert.equal(initial.table?.windowStartRow, 1)
    assert.equal(initial.table?.windowEndRow, 200)
    assert.equal(initial.table?.totalRows, 650)
    const revision = initial.table?.revision
    if (!revision) throw new Error('CSV 编辑预览缺少版本标识')

    const secondPage = await readEntryPage(root, base.id, 'large.csv', 201, 200)
    assert.equal(secondPage.rows.length, 200)
    assert.equal(secondPage.windowStartRow, 201)
    assert.equal(secondPage.windowEndRow, 400)
    assert.equal(secondPage.rows[0]?.[0], '原始201')

    await assert.rejects(() => writeEntryContent(root, base.id, 'large.csv', { kind: 'table-patch', patch: {
      revision,
      headerChanges: [],
      cellChanges: [{ row: 651, column: 0, value: '越界' }],
    } }), (error: unknown) => error instanceof KbError && error.code === 'csv_patch_invalid')

    await writeEntryContent(root, base.id, 'large.csv', { kind: 'table-patch', patch: {
      revision,
      headerChanges: [{ column: 0, value: '新名称' }],
      cellChanges: [{ row: 201, column: 0, value: '已修改201' }],
    } })
    const written = await readFile(join(root, 'bases', base.id, 'large.csv'), 'utf8')
    assert.match(written, /^\uFEFF新名称,编号\n原始1,1/m)
    assert.match(written, /已修改201,201/)

    await assert.rejects(() => writeEntryContent(root, base.id, 'large.csv', { kind: 'table-patch', patch: {
      revision,
      headerChanges: [],
      cellChanges: [{ row: 1, column: 0, value: '过期' }],
    } }), (error: unknown) => error instanceof KbError && error.code === 'csv_revision_conflict')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('坏 CSV 只失败当前文件，批次后续文件继续导入', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '混合', description: 'CSV 测试' })
    const source = join(root, 'source')
    await mkdir(source)
    await writeFile(join(source, 'bad.csv'), Buffer.from([0xff, 0xfe, 0xfd]))
    await writeFile(join(source, 'ok.md'), '仍然导入')
    const result = await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    assert.equal(result.failed, 1)
    assert.equal(result.files.find((item) => item.sourceRelPath === 'bad.csv')?.code, 'csv_encoding_invalid')
    assert.ok(result.copied.includes('ok.md'))
    assert.equal(await readFile(join(root, 'bases', base.id, 'ok.md'), 'utf8'), '仍然导入')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 严格校验控制字符、超长物理行和读取上限', async () => {
  const root = await sandbox()
  try {
    const control = join(root, 'control.csv')
    await writeFile(control, Buffer.from('a,\u0001\n', 'utf8'))
    const controlResult = await readValidatedUtf8Csv(control, 100)
    assert.equal(controlResult.ok, false)
    if (!controlResult.ok) assert.equal(controlResult.code, 'csv_control_character')

    const longLine = join(root, 'long.csv')
    await writeFile(longLine, Buffer.from('x'.repeat(CSV_MAX_PHYSICAL_LINE_BYTES + 1), 'utf8'))
    const longResult = await readValidatedUtf8Csv(longLine, CSV_MAX_PHYSICAL_LINE_BYTES + 2)
    assert.equal(longResult.ok, false)
    if (!longResult.ok) assert.equal(longResult.code, 'csv_line_too_long')

    const tooLarge = await readValidatedUtf8Csv(longLine, 10)
    assert.equal(tooLarge.ok, false)
    if (!tooLarge.ok) assert.equal(tooLarge.code, 'file_too_large')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 同值多行各自成条，搜后面的值不会落到第一条', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '多行', description: 'CSV 测试' })
    const source = join(root, 'ledger.csv')
    await writeFile(source, '名称,金额\n甲公司,120\n乙公司,120\n丙公司,80\n')
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })

    const sameValue = await searchBase(root, { baseId: base.id, query: '120' })
    assert.equal(sameValue.files.length, 1)
    assert.equal(sameValue.files[0]?.hits.length, 2)
    assert.equal(sameValue.files[0]?.hits[0]?.matchedExcerpt, '名称: 甲公司 | 金额: 120')
    assert.equal(sameValue.files[0]?.hits[1]?.matchedExcerpt, '名称: 乙公司 | 金额: 120')

    const later = await searchBase(root, { baseId: base.id, query: '丙公司' })
    assert.equal(later.files.length, 1)
    assert.equal(later.files[0]?.hits.length, 1)
    assert.equal(later.files[0]?.hits[0]?.matchLine, 4)
    assert.equal(later.files[0]?.hits[0]?.matchedExcerpt, '名称: 丙公司 | 金额: 80')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 末段命中返回围绕命中的窗口，不退化为文件头', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '窗口', description: 'CSV 测试' })
    const source = join(root, 'window.csv')
    const body = Array.from({ length: 40 }, (_, index) => index === 39 ? '末段关键字,1' : `第${index + 1}行,0`).join('\n')
    await writeFile(source, body)
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    const search = await searchBase(root, { baseId: base.id, query: '末段关键字' })
    const hit = search.files[0]?.hits[0]
    if (!hit) throw new Error('未找到末段命中')
    const preview = await readEntry(root, base.id, hit.path, {
      view: 'search-hit',
      matchLine: hit.matchLine,
      matchColumnByte: hit.matchColumnByte,
      sourceFingerprint: hit.sourceFingerprint,
    })
    assert.ok(preview.windowStartLine > 1)
    assert.equal(preview.focusLine, 40)
    assert.match(preview.text, /末段关键字/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 表格按逻辑记录处理引号内换行，并在保存时规范为逗号 CSV', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '逻辑记录', description: 'CSV 测试' })
    const source = join(root, 'quoted.csv')
    await writeFile(source, '供应商;备注;金额\n甲公司;"第一行\n第二行, 含逗号";120\n乙公司;正常;80\n')
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    const search = await searchBase(root, { baseId: base.id, query: '第二行' })
    const hit = search.files[0]?.hits[0]
    if (!hit) throw new Error('未找到引号内换行的命中')
    assert.equal(hit.matchLine, 3)
    assert.equal(search.files[0]?.groupHeader, '列: 供应商 | 备注 | 金额')
    assert.doesNotMatch(hit.excerpt, /^列: /)
    assert.match(hit.excerpt, /备注: 第一行↩第二行, 含逗号/)
    assert.equal(hit.matchedExcerpt, '供应商: 甲公司 | 备注: 第一行↩第二行, 含逗号 | 金额: 120')

    const preview = await readEntry(root, base.id, hit.path, {
      view: 'search-hit',
      matchLine: hit.matchLine,
      matchColumnByte: hit.matchColumnByte,
      sourceFingerprint: hit.sourceFingerprint,
    })
    if (preview.kind !== 'table') throw new Error('CSV 命中预览应为表格形态')
    assert.deepEqual(preview.table?.headers, ['供应商', '备注', '金额'])
    assert.deepEqual(preview.table?.rows[0], ['甲公司', '第一行\n第二行, 含逗号', '120'])
    assert.equal(preview.table?.focusedRow, 1)

    await writeEntryContent(root, base.id, 'quoted.csv', { kind: 'text', text: '供应商;备注\n甲公司;"第一行\n第二行, 含逗号"' })
    const written = await readFile(join(root, 'bases', base.id, 'quoted.csv'))
    assert.equal(written.subarray(3).toString('utf8'), '供应商,备注\n甲公司,"第一行\n第二行, 含逗号"')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 支持 CR 物理换行，预览仍按记录展示', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: 'CR 换行', description: 'CSV 测试' })
    const source = join(root, 'cr.csv')
    await writeFile(source, '名称,金额\r甲公司,120\r')
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    const preview = await readEntry(root, base.id, 'cr.csv')
    if (preview.kind !== 'table') throw new Error('CSV 预览应为表格形态')
    assert.deepEqual(preview.table?.headers, ['名称', '金额'])
    assert.deepEqual(preview.table?.rows, [['甲公司', '120']])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 编辑同时服从单文件和单库配额', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '编辑配额', description: 'CSV 测试' })
    const catalog = await readCatalog(root)
    catalog.prefs = { ...catalog.prefs, maxFileBytes: 8, maxBaseBytes: 100 }
    await writeCatalog(root, catalog)
    await assert.rejects(() => writeEntryContent(root, base.id, 'limit.csv', { kind: 'text', text: '名称\n甲公司' }), (error: unknown) => (
      error instanceof KbError && error.code === 'file_too_large'
    ))

    catalog.prefs = { ...catalog.prefs, maxFileBytes: 100, maxBaseBytes: 8 }
    await writeCatalog(root, catalog)
    await assert.rejects(() => writeEntryContent(root, base.id, 'limit.csv', { kind: 'text', text: '名称\n甲公司' }), (error: unknown) => (
      error instanceof KbError && error.code === 'quota'
    ))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

const GBK_TABLE = Buffer.from([195, 251, 179, 198, 44, 189, 240, 182, 238, 10, 188, 215, 185, 171, 203, 190, 44, 49, 50, 48, 10])
const NORMALIZED_TABLE = encodeUtf8CsvWithBom('名称,金额\n甲公司,120\n')

function encodeUtf16Be(text: string): Buffer {
  const littleEndian = Buffer.from(`\uFEFF${text}`, 'utf16le')
  const bigEndian = Buffer.alloc(littleEndian.length)
  for (let index = 0; index < littleEndian.length; index += 2) {
    bigEndian[index] = littleEndian[index + 1] ?? 0
    bigEndian[index + 1] = littleEndian[index] ?? 0
  }
  return bigEndian
}

function gb18030Available(): boolean {
  try {
    void new TextDecoder('gb18030', { fatal: true })
    return true
  } catch {
    return false
  }
}

test('导入时把无 BOM、CRLF 的 UTF-8 CSV 写成 UTF-8 BOM + LF', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '归一', description: 'CSV 测试' })
    const source = join(root, 'plain.csv')
    await writeFile(source, '名称,金额\r\n甲公司,120\r\n')
    const result = await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    assert.deepEqual(result.copied, ['plain.csv'])
    assert.deepEqual(await readFile(join(root, 'bases', base.id, 'plain.csv')), NORMALIZED_TABLE)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('UTF-16 CSV 导入后写成 UTF-8 BOM 且可按列名检索', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: 'UTF16', description: 'CSV 测试' })
    const sourceDir = join(root, 'source')
    await mkdir(sourceDir)
    await writeFile(join(sourceDir, 'le.csv'), Buffer.from('\uFEFF名称,金额\n甲公司,120\n', 'utf16le'))
    await writeFile(join(sourceDir, 'be.csv'), encodeUtf16Be('名称,金额\n乙公司,80\n'))
    const result = await ingest(root, { baseId: base.id, sourcePath: sourceDir, destCategory: '' })
    assert.ok(result.copied.includes('le.csv'))
    assert.ok(result.copied.includes('be.csv'))
    assert.deepEqual(await readFile(join(root, 'bases', base.id, 'le.csv')), NORMALIZED_TABLE)

    const search = await searchBase(root, { baseId: base.id, query: '乙公司' })
    const group = search.files[0]
    assert.equal(group?.path, 'be.csv')
    assert.equal(group?.groupHeader, '列: 名称 | 金额')
    assert.equal(group?.hits[0]?.excerpt, '名称: 乙公司 | 金额: 80')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('GB18030 CSV 导入后写成 UTF-8 BOM，同内容 UTF-8 会跳过', { skip: !gb18030Available() }, async () => {
  const decoded = decodeCsvBytes(GBK_TABLE)
  assert.equal(decoded.ok, true)
  if (decoded.ok) assert.equal(decoded.encoding, 'gb18030')

  const root = await sandbox()
  try {
    const base = await createBase(root, { title: 'GBK', description: 'CSV 测试' })
    const source = join(root, 'gbk.csv')
    await writeFile(source, GBK_TABLE)
    const result = await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    assert.deepEqual(result.copied, ['gbk.csv'])
    assert.ok(result.warnings.some((warning) => warning.includes('encoding_assumed_gb18030')))
    assert.deepEqual(await readFile(join(root, 'bases', base.id, 'gbk.csv')), NORMALIZED_TABLE)

    const utf8Source = join(root, 'utf8.csv')
    await writeFile(utf8Source, '名称,金额\n甲公司,120\n')
    const skipped = await ingest(root, { baseId: base.id, sourcePath: utf8Source, destCategory: '' })
    assert.equal(skipped.skipped, 1)
    assert.equal(skipped.copied.length, 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('表头命中只返回列名行，不把表头扩成列名: 列名', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '表头', description: 'CSV 测试' })
    const source = join(root, 'header.csv')
    await writeFile(source, '供应商,金额\n甲公司,120\n')
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    const search = await searchBase(root, { baseId: base.id, query: '供应商' })
    const hit = search.files[0]?.hits.find((item) => item.matchLine === 1)
    assert.equal(hit?.excerpt, '列: 供应商 | 金额')
    assert.equal(hit?.matchedExcerpt, '列: 供应商 | 金额')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('截断 UTF-16 与空 CSV 导入失败', async () => {
  assert.equal(decodeCsvBytes(Buffer.from([0xff, 0xfe, 0xfd])).ok, false)
  assert.equal(decodeCsvBytes(Buffer.from([0xef, 0xbb, 0xbf])).ok, true)
  const empty = decodeCsvBytes(Buffer.from([0xef, 0xbb, 0xbf]))
  if (empty.ok) assert.equal(empty.text, '')

  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '坏编码', description: 'CSV 测试' })
    const emptyFile = join(root, 'empty.csv')
    await writeFile(emptyFile, Buffer.from([0xef, 0xbb, 0xbf]))
    const result = await ingest(root, { baseId: base.id, sourcePath: emptyFile, destCategory: '' })
    assert.equal(result.failed, 1)
    assert.equal(result.files[0]?.code, 'csv_encoding_invalid')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('大量中文命中时嵌套类目下的中文文件名仍能打开', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '分片', description: 'CSV 测试' })
    const source = join(root, '供应商台账.csv')
    const rows = Array.from({ length: 220 }, (_, index) => `HT-${index},深圳启明供应链,${'备注'.repeat(20)}`)
    await writeFile(source, `合同编号,供应商,备注\n${rows.join('\n')}\n`)
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '合同/2026' })
    const search = await searchBase(root, { baseId: base.id, query: '深圳启明供应链' })
    assert.equal(search.files[0]?.path, '合同/2026/供应商台账.csv')
    assert.match(search.files[0]?.hits[0]?.excerpt ?? '', /供应商: 深圳启明供应链/)
    assert.equal(search.scanComplete, false)
    assert.equal(search.hasMore, true)
    assert.match(search.warnings.join(' '), /扫描上限/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CSV 相邻 excerpt 合并按行去重，表头行不混入记录', () => {
  const text = '名称,金额\n甲公司,120\n乙公司,80\n'
  const document = createCsvSearchDocument(Buffer.from(text), text)
  const first = document.excerptAt(2, 0)
  const second = document.excerptAt(3, 0)
  const merged = document.mergeExcerpt(first, second, first.startLine, second.endLine)
  assert.equal(merged, '名称: 甲公司 | 金额: 120\n名称: 乙公司 | 金额: 80')
  assert.equal(document.mergeExcerpt(first, first, first.startLine, first.endLine), '名称: 甲公司 | 金额: 120')
})

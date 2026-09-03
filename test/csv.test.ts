import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase, readEntry, writeEntry } from '../src/bases.ts'
import { readCatalog, writeCatalog } from '../src/catalog.ts'
import { CSV_MAX_PHYSICAL_LINE_BYTES } from '../src/identity.ts'
import { readValidatedUtf8Csv } from '../src/content/csv/server/encoding.ts'
import { ingest } from '../src/ingest.ts'
import { searchBase } from '../src/search.ts'
import { KbError } from '../src/types.ts'

async function sandbox(prefix = 'zy-csv-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

test('UTF-8 CSV 保留原字节、可搜索、表格预览和编辑', async () => {
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
    const hit = search.hits[0]
    assert.equal(hit?.path, 'table.CSV')
    assert.equal(hit?.matchLine, 2)
    assert.equal(hit?.matchColumnByte, 4)
    assert.equal('documents' in search, false)

    const preview = await readEntry(root, base.id, 'table.CSV', {
      view: 'search-hit',
      matchLine: hit?.matchLine,
      matchColumnByte: hit?.matchColumnByte,
      sourceFingerprint: hit?.sourceFingerprint,
    })
    assert.equal(preview.format, 'csv')
    assert.equal(preview.capabilities.canEdit, true)
    assert.equal(preview.previewStatus, 'ready')
    assert.equal(preview.focusLine, 2)
    assert.equal(preview.focusColumnByte, 4)
    assert.doesNotMatch(preview.text, /^\uFEFF/)
    assert.deepEqual(preview.csv, {
      headers: ['名称', '金额'],
      rows: [['甲公司', '120']],
      totalRows: 1,
      windowStartRow: 1,
      windowEndRow: 1,
      complete: false,
      focusedRow: 1,
    })

    const editable = await readEntry(root, base.id, 'table.CSV', { view: 'tree', readMode: 'edit' })
    assert.equal(editable.csv?.complete, true)
    await writeEntry(root, base.id, 'table.CSV', '名称,金额\n乙公司,"98,000"')
    const written = await readFile(join(root, 'bases', base.id, 'table.CSV'))
    assert.deepEqual(written.subarray(0, 3), Buffer.from([0xef, 0xbb, 0xbf]))
    assert.equal(written.subarray(3).toString('utf8'), '名称,金额\n乙公司,"98,000"')
    await assert.rejects(() => writeEntry(root, base.id, 'table.CSV', '名称,金额\n"未闭合'), (error: unknown) => (
      error instanceof KbError && error.code === 'csv_parse_invalid'
    ))
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

test('CSV 末段命中返回围绕命中的窗口，不退化为文件头', async () => {
  const root = await sandbox()
  try {
    const base = await createBase(root, { title: '窗口', description: 'CSV 测试' })
    const source = join(root, 'window.csv')
    const body = Array.from({ length: 40 }, (_, index) => index === 39 ? '末段关键字,1' : `第${index + 1}行,0`).join('\n')
    await writeFile(source, body)
    await ingest(root, { baseId: base.id, sourcePath: source, destCategory: '' })
    const search = await searchBase(root, { baseId: base.id, query: '末段关键字' })
    const hit = search.hits[0]
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
    const hit = search.hits[0]
    if (!hit) throw new Error('未找到引号内换行的命中')
    assert.equal(hit.matchLine, 3)

    const preview = await readEntry(root, base.id, hit.path, {
      view: 'search-hit',
      matchLine: hit.matchLine,
      matchColumnByte: hit.matchColumnByte,
      sourceFingerprint: hit.sourceFingerprint,
    })
    assert.deepEqual(preview.csv?.headers, ['供应商', '备注', '金额'])
    assert.deepEqual(preview.csv?.rows[0], ['甲公司', '第一行\n第二行, 含逗号', '120'])
    assert.equal(preview.csv?.focusedRow, 1)

    await writeEntry(root, base.id, 'quoted.csv', '供应商;备注\n甲公司;"第一行\n第二行, 含逗号"')
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
    assert.deepEqual(preview.csv?.headers, ['名称', '金额'])
    assert.deepEqual(preview.csv?.rows, [['甲公司', '120']])
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
    await assert.rejects(() => writeEntry(root, base.id, 'limit.csv', '名称\n甲公司'), (error: unknown) => (
      error instanceof KbError && error.code === 'file_too_large'
    ))

    catalog.prefs = { ...catalog.prefs, maxFileBytes: 100, maxBaseBytes: 8 }
    await writeCatalog(root, catalog)
    await assert.rejects(() => writeEntry(root, base.id, 'limit.csv', '名称\n甲公司'), (error: unknown) => (
      error instanceof KbError && error.code === 'quota'
    ))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

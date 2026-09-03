import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBase, readEntry, writeEntry } from '../src/bases.ts'
import { CSV_MAX_PHYSICAL_LINE_BYTES } from '../src/identity.ts'
import { readValidatedUtf8Csv } from '../src/content/csv/server/encoding.ts'
import { ingest } from '../src/ingest.ts'
import { searchBase } from '../src/search.ts'
import { KbError } from '../src/types.ts'

async function sandbox(prefix = 'zy-csv-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

test('UTF-8 CSV 保留原字节、可搜索并按只读预览返回', async () => {
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
    assert.equal(preview.capabilities.canEdit, false)
    assert.equal(preview.previewStatus, 'ready')
    assert.equal(preview.focusLine, 2)
    assert.equal(preview.focusColumnByte, 4)
    assert.doesNotMatch(preview.text, /^\uFEFF/)
    await assert.rejects(() => writeEntry(root, base.id, 'table.CSV', '改写'), (error: unknown) => (
      error instanceof KbError && error.code === 'read_only_format'
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

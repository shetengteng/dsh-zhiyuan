import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { preparePdfImport } from '../../src/formats/pdf/pdf-format.ts'
import { normalizeRadicals } from '../../src/formats/pdf/radical-normalize.ts'
import { layoutPdfPage, type PdfTextItem } from '../../src/formats/pdf/text-layout.ts'
import { KbError } from '../../src/model/error/kb-error.ts'
import { buildScannedPdf, buildSimplePdf } from './pdf-fixtures.ts'

// PDF 转换测试：text-layout 纯函数直接喂 items；整档转换走真实子进程（unpdf / PDF.js），
// 夹具由 pdf-fixtures 生成最小编造 PDF 字节。

function item(str: string, x: number, y: number, width = 0, height = 12): PdfTextItem {
  return { str, x, y, width, height, hasEol: false }
}

test('行重组：单 item 原样输出', () => {
  assert.equal(layoutPdfPage([item('Hello', 72, 720)]), 'Hello')
})

test('行重组：同行按 x 排序，中文邻接直拼不补空格', () => {
  const text = layoutPdfPage([item('测试', 96, 720, 24), item('知源', 72, 720, 24)])
  assert.equal(text, '知源测试')
})

test('行重组：拉丁之间间距大补空格，紧邻直拼', () => {
  const spaced = layoutPdfPage([item('Hello', 72, 720, 25), item('World', 120, 720, 25)])
  assert.equal(spaced, 'Hello World')
  const tight = layoutPdfPage([item('Hel', 72, 720, 18), item('lo', 90, 720, 12)])
  assert.equal(tight, 'Hello')
})

test('行重组：不同 y 值分行，行间双换行', () => {
  const text = layoutPdfPage([item('第二行', 72, 700), item('第一行', 72, 720)])
  assert.equal(text, '第一行\n\n第二行')
})

test('行重组：空白 item 过滤，空输入返回空串', () => {
  assert.equal(layoutPdfPage([]), '')
  assert.equal(layoutPdfPage([item('   ', 72, 720)]), '')
})

test('行重组：小字号紧排行不并行（容差按行内最大字高）', () => {
  const text = layoutPdfPage([
    item('第一行', 72, 720, 24, 10),
    item('第二行', 72, 708, 24, 10),
    item('第三行', 72, 696, 24, 10),
  ])
  assert.equal(text, '第一行\n\n第二行\n\n第三行')
})

test('部首归一：部首区字符替换为统一表意字，正常文本原样保留', () => {
  assert.equal(normalizeRadicals('⽂档⻓期⼊⽤'), '文档长期入用')
  assert.equal(normalizeRadicals('知源知识库 base 2026'), '知源知识库 base 2026')
  // 全角字符不在部首区，不受影响
  assert.equal(normalizeRadicals('ＡＢＣ１２３'), 'ＡＢＣ１２３')
  // 不成字部首无映射，原样保留
  assert.equal(normalizeRadicals('⺀'), '⺀')
})

async function sandbox(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zy-pdf-'))
}

async function convertToMarkdown(bytes: Buffer): Promise<{ markdown: string; warnings: string[] }> {
  const dir = await sandbox()
  try {
    const source = join(dir, '样张.pdf')
    await writeFile(source, bytes)
    const prepared = await preparePdfImport({ sourcePath: source, sourceName: '样张.pdf', maxFileBytes: 5 * 1024 * 1024 })
    assert.equal(prepared.kind, 'entries')
    const entries = prepared.kind === 'entries' ? prepared.entries : []
    assert.equal(entries.length, 1)
    const entry = entries[0]!
    assert.equal(entry.format, 'markdown')
    assert.equal(entry.outputName, '样张.md')
    assert.equal(entry.content.kind, 'bytes')
    return {
      markdown: entry.content.kind === 'bytes' ? entry.content.bytes.toString('utf8') : '',
      warnings: entry.warnings ?? [],
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('整档转换：两页英文样张都提取，页间分隔', async () => {
  const bytes = buildSimplePdf([
    ['Zhiyuan PDF import', 'first page body'],
    ['second page heading', 'trailing content'],
  ])
  const { markdown } = await convertToMarkdown(bytes)
  assert.ok(markdown.includes('Zhiyuan PDF import'))
  assert.ok(markdown.includes('first page body'))
  assert.ok(markdown.includes('second page heading'))
  assert.ok(markdown.includes('trailing content'))
  assert.ok(markdown.indexOf('second page heading') > markdown.indexOf('first page body'))
})

test('整档转换：同页两行按 y 排序，不颠倒阅读顺序', async () => {
  const bytes = buildSimplePdf([['title line', 'body line']])
  const { markdown } = await convertToMarkdown(bytes)
  assert.ok(markdown.indexOf('title line') < markdown.indexOf('body line'))
})

test('整档转换：损坏字节与扫描件失败，错误码为 pdf_invalid', async () => {
  const dir = await sandbox()
  try {
    const broken = join(dir, 'broken.pdf')
    await writeFile(broken, Buffer.from('这不是一个 PDF'))
    await assert.rejects(
      () => preparePdfImport({ sourcePath: broken, sourceName: 'broken.pdf', maxFileBytes: 5 * 1024 * 1024 }),
      (error: unknown) => error instanceof KbError && error.code === 'pdf_invalid',
    )
    const scanned = join(dir, 'scanned.pdf')
    await writeFile(scanned, buildScannedPdf())
    await assert.rejects(
      () => preparePdfImport({ sourcePath: scanned, sourceName: 'scanned.pdf', maxFileBytes: 5 * 1024 * 1024 }),
      (error: unknown) => error instanceof KbError && error.code === 'pdf_invalid',
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('整档转换：超限源快速拒绝，不产出条目', async () => {
  const dir = await sandbox()
  try {
    const source = join(dir, 'big.pdf')
    await writeFile(source, buildSimplePdf([['hello']]))
    await assert.rejects(
      () => preparePdfImport({ sourcePath: source, sourceName: 'big.pdf', maxFileBytes: 8 }),
      (error: unknown) => error instanceof KbError && error.code === 'file_too_large',
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

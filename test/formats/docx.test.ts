import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { convertHtmlToMarkdown } from '../../src/formats/shared/html-output-policy.ts'
import { prepareDocxImport } from '../../src/formats/docx/docx-format.ts'
import { KbError } from '../../src/model/error/kb-error.ts'
import {
  CONTENT_TYPES_XML,
  ROOT_RELS_XML,
  SAMPLE_PNG,
  boldRun,
  buildDocxZip,
  documentXml,
  headingParagraph,
  headingStyle,
  hyperlinkParagraph,
  imageParagraph,
  italicRun,
  listParagraph,
  numberingXml,
  plainRun,
  relsXml,
  stylesXml,
  styledRunParagraph,
  tableXml,
  textParagraph,
  type DocxPart,
} from './docx-fixtures.ts'

// DOCX 转换测试：走真实子进程（mammoth → turndown），夹具由 docx-fixtures 生成。

const SHOWCASE_RELS = relsXml([
  `<Relationship Id="rSite" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/path" TargetMode="External"/>`,
  `<Relationship Id="rMail" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="mailto:kb@example.com" TargetMode="External"/>`,
].join(''))

function showcaseDocx(): Buffer {
  const body = [
    headingParagraph('H1', '项目介绍'),
    headingParagraph('H2', '导入流程'),
    headingParagraph('H3', '细节补充'),
    styledRunParagraph([boldRun('知源'), plainRun('按语义转换，'), italicRun('不保留版式')].join('')),
    listParagraph('选择源路径'),
    listParagraph('等待转换完成'),
    tableXml([
      ['名称', '金额'],
      ['甲公司', '120'],
    ]),
    hyperlinkParagraph('rSite', '官网'),
    hyperlinkParagraph('rMail', '写信给我们'),
    textParagraph('结尾段落'),
  ].join('')
  const styles = stylesXml([
    headingStyle('H1', '标题 1'),
    headingStyle('H2', '标题 2'),
    headingStyle('H3', 'Heading 3'),
  ].join(''))
  const parts: DocxPart[] = [
    { name: '[Content_Types].xml', data: CONTENT_TYPES_XML },
    { name: '_rels/.rels', data: ROOT_RELS_XML },
    { name: 'word/document.xml', data: documentXml(body) },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/numbering.xml', data: numberingXml() },
    { name: 'word/_rels/document.xml.rels', data: SHOWCASE_RELS },
  ]
  return buildDocxZip(parts)
}

const MALICIOUS_RELS = relsXml([
  `<Relationship Id="rJs" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:alert(1)" TargetMode="External"/>`,
  `<Relationship Id="rData" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="data:text/html;base64,PHNjcmlwdD4=" TargetMode="External"/>`,
  `<Relationship Id="rFile" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="file:///etc/passwd" TargetMode="External"/>`,
  `<Relationship Id="rNone" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="同目录引用.docx"/>`,
  `<Relationship Id="rImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>`,
].join(''))

function maliciousDocx(): Buffer {
  const body = [
    hyperlinkParagraph('rJs', '点我中奖'),
    hyperlinkParagraph('rData', '内嵌数据'),
    hyperlinkParagraph('rFile', '本地文件'),
    hyperlinkParagraph('rNone', '同目录引用'),
    imageParagraph('rImg'),
    textParagraph('正文还在'),
  ].join('')
  const parts: DocxPart[] = [
    { name: '[Content_Types].xml', data: CONTENT_TYPES_XML },
    { name: '_rels/.rels', data: ROOT_RELS_XML },
    { name: 'word/document.xml', data: documentXml(body) },
    { name: 'word/_rels/document.xml.rels', data: MALICIOUS_RELS },
    { name: 'word/media/image1.png', data: SAMPLE_PNG },
  ]
  return buildDocxZip(parts)
}

async function sandbox(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zy-docx-'))
}

async function writeDocx(dir: string, name: string, bytes: Buffer): Promise<string> {
  const source = join(dir, name)
  await writeFile(source, bytes)
  return source
}

async function convertToMarkdown(bytes: Buffer): Promise<string> {
  const dir = await sandbox()
  try {
    const source = await writeDocx(dir, '样张.docx', bytes)
    const prepared = await prepareDocxImport({ sourcePath: source, sourceName: '样张.docx', maxFileBytes: 5 * 1024 * 1024 })
    assert.equal(prepared.kind, 'entries')
    const entries = prepared.kind === 'entries' ? prepared.entries : []
    assert.equal(entries.length, 1)
    const entry = entries[0]!
    assert.equal(entry.format, 'markdown')
    assert.equal(entry.outputName, '样张.md')
    assert.equal(entry.content.kind, 'bytes')
    return entry.content.kind === 'bytes' ? entry.content.bytes.toString('utf8') : ''
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('标准样张：中英标题、粗斜体、列表、表格与 https/mailto 链接都保留', async () => {
  const markdown = await convertToMarkdown(showcaseDocx())
  assert.ok(markdown.includes('# 项目介绍'))
  assert.ok(markdown.includes('## 导入流程'))
  assert.ok(markdown.includes('### 细节补充'))
  assert.ok(markdown.includes('**知源**'))
  assert.ok(markdown.includes('*不保留版式*'))
  assert.ok(markdown.includes('- 选择源路径'))
  assert.ok(markdown.includes('| 名称'))
  assert.ok(markdown.includes('| --- |'))
  assert.ok(markdown.includes('甲公司'))
  assert.ok(markdown.includes('金额'))
  assert.ok(markdown.includes('[官网](https://example.com/path)'))
  assert.ok(markdown.includes('[写信给我们](mailto:kb@example.com)'))
  assert.ok(markdown.includes('结尾段落'))
})

test('恶意链接与图片：协议白名单外与相对链接丢弃，正文与图片不残留', async () => {
  const markdown = await convertToMarkdown(maliciousDocx())
  assert.ok(!markdown.includes('javascript:'))
  assert.ok(!markdown.includes('data:'))
  assert.ok(!markdown.includes('file:'))
  assert.ok(!markdown.includes(']('))
  assert.ok(!markdown.includes('!['))
  assert.ok(markdown.includes('点我中奖'))
  assert.ok(markdown.includes('同目录引用'))
  assert.ok(markdown.includes('正文还在'))
})

test('非法字节与超限源：失败不产出库内条目', async () => {
  const dir = await sandbox()
  try {
    const broken = await writeDocx(dir, 'broken.docx', Buffer.from('这不是一个 zip'))
    await assert.rejects(
      () => prepareDocxImport({ sourcePath: broken, sourceName: 'broken.docx', maxFileBytes: 5 * 1024 * 1024 }),
      KbError,
    )
    const big = await writeDocx(dir, 'big.docx', Buffer.alloc(64, 1))
    await assert.rejects(
      () => prepareDocxImport({ sourcePath: big, sourceName: 'big.docx', maxFileBytes: 8 }),
      (error: unknown) => error instanceof KbError && error.code === 'file_too_large',
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('HTML 策略：https 与 mailto 保留，其余协议与相对链接只留文字', () => {
  const html = [
    '<p><a href="https://a.dev">外链</a></p>',
    '<p><a href="mailto:a@b.c">邮件</a></p>',
    '<p><a href="javascript:x()">脚本</a></p>',
    '<p><a href="relative.md">相对</a></p>',
    '<p><img src="data:image/png;base64,x"/></p>',
    '<p><script>bad()</script>文本</p>',
  ].join('')
  const result = convertHtmlToMarkdown(html)
  assert.ok(result.markdown.includes('[外链](https://a.dev)'))
  assert.ok(result.markdown.includes('[邮件](mailto:a@b.c)'))
  assert.ok(!result.markdown.includes('javascript:'))
  assert.ok(!result.markdown.includes('relative.md'))
  assert.ok(!result.markdown.includes('data:image'))
  assert.ok(result.markdown.includes('外链'))
  assert.ok(result.markdown.includes('脚本'))
  assert.ok(result.markdown.includes('相对'))
  assert.ok(!result.markdown.includes('bad()'))
  assert.equal(result.droppedLinkCount, 2)
})

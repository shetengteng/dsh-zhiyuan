import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { prepareHtmlImport } from '../../src/formats/html/html-format.ts'
import { isHtmlConvertRequest } from '../../src/formats/html/html-request.ts'
import { decodeHtmlBytes } from '../../src/formats/html/server/charset.ts'
import { KbError } from '../../src/model/error/kb-error.ts'

// HTML 导入测试：走真实子进程（domino → turndown），字符集覆盖 UTF-8 / UTF-16 / GBK。

const SHOWCASE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>站点名 - 页面标题</title>
  <style>body { color: red }</style>
  <script>console.log('noise')</script>
</head>
<body>
  <h1>项目介绍</h1>
  <h2>导入流程</h2>
  <p>知源按语义转换，<strong>不保留版式</strong>。</p>
  <ul><li>选择源路径</li><li>等待转换完成</li></ul>
  <table><tr><th>名称</th><th>金额</th></tr><tr><td>甲公司</td><td>120</td></tr></table>
  <p><a href="https://example.com/path">官网</a> 与 <a href="mailto:kb@example.com">写信给我们</a></p>
  <pre><code>const x = 1</code></pre>
</body>
</html>
`

const MALICIOUS_HTML = `<!DOCTYPE html>
<html><body>
  <a href="javascript:alert(1)">点我中奖</a>
  <a href="/relative/page.html">站内链接</a>
  <img src="https://example.com/pixel.gif" alt="追踪像素">
  <iframe src="https://example.com/embed"></iframe>
  <script>bad()</script>
  <p>正文还在</p>
</body></html>
`

// GBK 字节由 iconv 预生成（Node 原生无法把文本编码为 GBK）
const GBK_DECLARED_HEX = '3c68746d6c3e3c686561643e3c6d65746120636861727365743d2267626b223e3c2f686561643e3c626f64793e3c68313ed6aad4b43c2f68313e3c703eb1beb5d8d6aacab6bfe2b5bcc8eb3c2f703e3c2f626f64793e3c2f68746d6c3e'
const GBK_UNDECLARED_HEX = '3c68746d6c3e3c626f64793e3c68313ec4e3bac3cac0bde73c2f68313e3c703ecedeb1e0c2ebc9f9c3f7b5c4c0cfd2b3c3e63c2f703e3c2f626f64793e3c2f68746d6c3e'

function utf16LeWithBom(text: string): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')])
}

async function sandbox(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zy-html-'))
}

async function convertToMarkdown(bytes: Buffer, sourceName = '样张.html'): Promise<{ markdown: string; warnings: string[] }> {
  const dir = await sandbox()
  try {
    const source = join(dir, sourceName)
    await writeFile(source, bytes)
    const prepared = await prepareHtmlImport({ sourcePath: source, sourceName, maxFileBytes: 5 * 1024 * 1024 })
    assert.equal(prepared.kind, 'entries')
    const entries = prepared.kind === 'entries' ? prepared.entries : []
    assert.equal(entries.length, 1)
    const entry = entries[0]!
    assert.equal(entry.format, 'markdown')
    assert.equal(entry.outputName, sourceName.replace(/\.html?$/i, '') + '.md')
    assert.equal(entry.content.kind, 'bytes')
    return {
      markdown: entry.content.kind === 'bytes' ? entry.content.bytes.toString('utf8') : '',
      warnings: entry.warnings ?? [],
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('标准样张：标题列表表格代码保留，head 噪音与 title 不混入正文', async () => {
  const { markdown } = await convertToMarkdown(Buffer.from(SHOWCASE_HTML, 'utf8'))
  assert.ok(markdown.includes('# 项目介绍'))
  assert.ok(markdown.includes('## 导入流程'))
  assert.ok(markdown.includes('**不保留版式**'))
  assert.ok(markdown.includes('- 选择源路径'))
  assert.ok(markdown.includes('| 名称'))
  assert.ok(markdown.includes('| --- |'))
  assert.ok(markdown.includes('[官网](https://example.com/path)'))
  assert.ok(markdown.includes('[写信给我们](mailto:kb@example.com)'))
  assert.ok(markdown.includes('const x = 1'))
  assert.ok(!markdown.includes('站点名'))
  assert.ok(!markdown.includes('console.log'))
  assert.ok(!markdown.includes('color: red'))
})

test('恶意页面：脚本、图片、iframe 与白名单外链接不残留，正文保留', async () => {
  const { markdown } = await convertToMarkdown(Buffer.from(MALICIOUS_HTML, 'utf8'))
  assert.ok(!markdown.includes('javascript:'))
  assert.ok(!markdown.includes('](/relative/page.html'))
  assert.ok(!markdown.includes('!['))
  assert.ok(!markdown.includes('iframe'))
  assert.ok(!markdown.includes('bad()'))
  assert.ok(markdown.includes('点我中奖'))
  assert.ok(markdown.includes('站内链接'))
  assert.ok(markdown.includes('正文还在'))
})

test('GBK 页面：meta 声明生效，中文不乱码', async () => {
  const { markdown } = await convertToMarkdown(Buffer.from(GBK_DECLARED_HEX, 'hex'))
  assert.ok(markdown.includes('# 知源'))
  assert.ok(markdown.includes('本地知识库导入'))
})

test('GBK 页面无声明：GB18030 兜底解码，警告可见', async () => {
  const { markdown, warnings } = await convertToMarkdown(Buffer.from(GBK_UNDECLARED_HEX, 'hex'))
  assert.ok(markdown.includes('# 你好世界'))
  assert.ok(markdown.includes('无编码声明的老页面'))
  assert.ok(warnings.some((warning) => warning.includes('GB18030')))
})

test('UTF-16LE BOM 页面正常解码', async () => {
  const { markdown } = await convertToMarkdown(utf16LeWithBom('<html><body><h1>宽字符页面</h1></body></html>'))
  assert.ok(markdown.includes('# 宽字符页面'))
})

test('声明 gbk 但实际是 UTF-8：UTF-8 优先，不产生乱码', () => {
  const bytes = Buffer.from('<html><head><meta charset="gbk"></head><body><p>中文内容</p></body></html>', 'utf8')
  const decoded = decodeHtmlBytes(bytes)
  assert.ok(decoded.ok)
  assert.equal(decoded.ok ? decoded.encoding : '', 'utf-8')
  assert.ok(decoded.ok ? decoded.text.includes('中文内容') : false)
})

test('非法字节：失败不产出库内条目', async () => {
  const dir = await sandbox()
  try {
    const broken = join(dir, 'broken.html')
    await writeFile(broken, Buffer.from([0xff, 0xfe, 0x00, 0xd8])) // UTF-16LE BOM + 孤立代理项
    await assert.rejects(
      () => prepareHtmlImport({ sourcePath: broken, sourceName: 'broken.html', maxFileBytes: 5 * 1024 * 1024 }),
      (error: unknown) => error instanceof KbError && error.code === 'io_failed',
    )
    const big = join(dir, 'big.html')
    await writeFile(big, Buffer.alloc(64, 1))
    await assert.rejects(
      () => prepareHtmlImport({ sourcePath: big, sourceName: 'big.html', maxFileBytes: 8 }),
      (error: unknown) => error instanceof KbError && error.code === 'file_too_large',
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('转换请求校验：kind、绝对路径、产物名与限额逐项把关', () => {
  const valid = { kind: 'convert-html', sourcePath: '/tmp/a.html', outputName: 'a.md', maxSourceBytes: 1024, maxOutputBytes: 1024 }
  assert.ok(isHtmlConvertRequest(valid))
  assert.ok(!isHtmlConvertRequest({ ...valid, kind: 'convert-docx' }))
  assert.ok(!isHtmlConvertRequest({ ...valid, sourcePath: 'a.html' }))
  assert.ok(!isHtmlConvertRequest({ ...valid, outputName: 'a.html' }))
  assert.ok(!isHtmlConvertRequest({ ...valid, outputName: 'sub/a.md' }))
  assert.ok(!isHtmlConvertRequest({ ...valid, maxSourceBytes: 1.5 }))
  assert.ok(!isHtmlConvertRequest({ ...valid, maxOutputBytes: 0 }))
  assert.ok(!isHtmlConvertRequest(null))
})

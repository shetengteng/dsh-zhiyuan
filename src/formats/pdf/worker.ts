import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { getDocumentProxy } from 'unpdf'
import { isPdfConvertRequest } from './pdf-request.ts'
import { normalizeRadicals } from './radical-normalize.ts'
import { layoutPdfPage, type PdfTextItem } from './text-layout.ts'

// PDF 转换子进程入口：只允许本文件 import unpdf。
// 协议与 DOCX worker 相同：接收一个已校验的请求，回传 diagnostic / output / done / failed 帧；不写库。
// 只提取文本层：扫描件、加密件明确失败，不做 OCR、不渲染、不抽图。

const MAX_PDF_PAGES = 512
/** 产物里可疑字符（U+FFFD 与控制字符）占比超过该值时发出映射告警。 */
const SUSPICIOUS_RATIO_THRESHOLD = 0.005

function send(frame: unknown): void {
  if (process.connected && typeof process.send === 'function') process.send(frame)
}

function fail(code: 'file_too_large' | 'io_failed' | 'pdf_invalid', message: string): never {
  send({ type: 'failed', code, message })
  process.exit(1)
}

function isPasswordError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'PasswordException'
}

/** 可疑字符：替换符与除 \n 外的 C0 控制字符，通常是字体映射失败的残留。 */
function isSuspiciousChar(text: string): boolean {
  const code = text.codePointAt(0) ?? 0
  if (code === 0xfffd) return true
  if (code < 0x20) return code !== 0x0a
  return code === 0x7f
}

/**
 * 收窄 PDF.js 的 textContent item：只取布局所需字段，外部输入全部显式校验。
 * transform 是 [a, b, c, d, e, f]，e 为 x、f 为 y（PDF 用户空间坐标）。
 */
function narrowItem(raw: unknown): PdfTextItem | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  if (typeof record.str !== 'string') return undefined
  if (!Array.isArray(record.transform) || record.transform.length < 6) return undefined
  const x = record.transform[4]
  const y = record.transform[5]
  if (typeof x !== 'number' || !Number.isFinite(x)) return undefined
  if (typeof y !== 'number' || !Number.isFinite(y)) return undefined
  const width = typeof record.width === 'number' && Number.isFinite(record.width) ? record.width : 0
  const height = typeof record.height === 'number' && Number.isFinite(record.height) ? record.height : 0
  return { str: record.str, x, y, width, height, hasEol: record.hasEOL === true }
}

async function convert(raw: unknown): Promise<void> {
  if (!isPdfConvertRequest(raw)) {
    fail('io_failed', '转换请求无效')
  }
  const source = await stat(raw.sourcePath)
  if (!source.isFile()) {
    fail('io_failed', '源文件不可读')
  }
  if (source.size > raw.maxSourceBytes) {
    fail('file_too_large', `单文件超过 ${raw.maxSourceBytes} 字节`)
  }
  const bytes = await readFile(raw.sourcePath)

  let pdf
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  } catch (error) {
    if (isPasswordError(error)) fail('io_failed', 'PDF 已加密，请先在本机解密后再导入')
    fail('pdf_invalid', 'PDF 解析失败，文件可能已损坏或不是有效的 PDF 文档')
  }
  if (pdf.numPages > MAX_PDF_PAGES) {
    fail('file_too_large', `PDF 页数超过上限（${MAX_PDF_PAGES} 页）`)
  }

  const pageTexts: string[] = []
  const emptyPages: number[] = []
  let totalChars = 0
  let suspiciousChars = 0
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const items: PdfTextItem[] = []
    for (const rawItem of content.items) {
      const item = narrowItem(rawItem)
      if (item) items.push(item)
    }
    const text = layoutPdfPage(items)
    if (!text) {
      emptyPages.push(pageNumber)
      continue
    }
    for (const ch of text) {
      totalChars++
      if (isSuspiciousChar(ch)) suspiciousChars++
    }
    pageTexts.push(text)
  }
  if (totalChars === 0) {
    fail('pdf_invalid', '未找到可提取的文字，可能是扫描件，知源暂不支持 OCR')
  }
  if (suspiciousChars / totalChars > SUSPICIOUS_RATIO_THRESHOLD) {
    send({ type: 'diagnostic', message: '部分文字可能无法正确映射，检索结果可能不完整' })
  }
  if (emptyPages.length > 0) {
    send({ type: 'diagnostic', message: `第 ${emptyPages.join('、')} 页没有文字层，未提取内容` })
  }

  // 部首区字符归一：Chrome 等导出器的 ToUnicode 会把部分汉字映射到部首区，不归一会导致检索失配
  const markdown = normalizeRadicals(pageTexts.join('\n\n'))
  const output = Buffer.from(markdown, 'utf8')
  if (output.length > raw.maxOutputBytes) {
    fail('file_too_large', `转换产物超过 ${raw.maxOutputBytes} 字节`)
  }
  send({
    type: 'output',
    outputName: raw.outputName,
    byteLength: output.length,
    digest: createHash('sha256').update(output).digest('hex'),
    bytes: output,
  })
  send({ type: 'done' })
  // 不主动 disconnect：大产物帧尚未刷完管道时断开会让父进程只收到 disconnect。
  // 正常完成由父进程 convert-worker 在 settle 后 kill；Host 崩溃时下方 disconnect 监听保证退出。
}

process.on('message', (raw: unknown) => {
  void convert(raw).catch(() => fail('pdf_invalid', 'PDF 解析失败，文件可能已损坏或不是有效的 PDF 文档'))
})

// Host 异常退出后不留孤儿转换进程
process.on('disconnect', () => process.exit(0))

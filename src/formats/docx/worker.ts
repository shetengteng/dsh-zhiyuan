import { createHash } from 'node:crypto'
import { stat } from 'node:fs/promises'
import mammoth from 'mammoth'
import { convertHtmlToMarkdown } from '../shared/html-output-policy.ts'
import { isDocxConvertRequest } from './docx-request.ts'
import { DOCX_STYLE_MAP } from './style-map.ts'

// DOCX 转换子进程入口：只允许本文件 import mammoth。
// 协议：接收一个已校验的请求，回传 diagnostic / output / done / failed 帧；不写库。

type MammothElement = { type?: string; children?: MammothElement[] }

/** 递归剔除文档模型里的图片节点，HTML 与产物 Markdown 不再出现 img。 */
function stripImages(element: MammothElement): MammothElement {
  if (!Array.isArray(element.children)) return element
  const children = element.children
    .filter((child) => child.type !== 'image')
    .map((child) => stripImages(child))
  return { ...element, children }
}

function send(frame: unknown): void {
  if (process.connected && typeof process.send === 'function') process.send(frame)
}

function fail(code: 'file_too_large' | 'io_failed', message: string): never {
  send({ type: 'failed', code, message })
  process.exit(1)
}

async function convert(raw: unknown): Promise<void> {
  if (!isDocxConvertRequest(raw)) {
    fail('io_failed', '转换请求无效')
  }
  const source = await stat(raw.sourcePath)
  if (!source.isFile()) {
    fail('io_failed', '源文件不可读')
  }
  if (source.size > raw.maxSourceBytes) {
    fail('file_too_large', `单文件超过 ${raw.maxSourceBytes} 字节`)
  }
  const result = await mammoth.convertToHtml(
    { path: raw.sourcePath },
    {
      styleMap: [...DOCX_STYLE_MAP],
      externalFileAccess: false,
      transformDocument: stripImages,
    },
  )
  for (const item of result.messages) {
    send({ type: 'diagnostic', message: `文档转换提示：${item.message}` })
  }
  const converted = convertHtmlToMarkdown(result.value)
  if (converted.droppedLinkCount > 0) {
    send({ type: 'diagnostic', message: `已移除 ${converted.droppedLinkCount} 个不允许保留的链接` })
  }
  const bytes = Buffer.from(converted.markdown, 'utf8')
  if (bytes.length > raw.maxOutputBytes) {
    fail('file_too_large', `转换产物超过 ${raw.maxOutputBytes} 字节`)
  }
  send({
    type: 'output',
    outputName: raw.outputName,
    byteLength: bytes.length,
    digest: createHash('sha256').update(bytes).digest('hex'),
    bytes,
  })
  send({ type: 'done' })
  // 不主动 disconnect：大产物帧尚未刷完管道时断开会让父进程只收到 disconnect。
  // 正常完成由父进程 convert-worker 在 settle 后 kill；Host 崩溃时下方 disconnect 监听保证退出。
}

process.on('message', (raw: unknown) => {
  void convert(raw).catch(() => fail('io_failed', 'DOCX 解析失败，文件可能已损坏或不是有效的 Word 文档'))
})

// Host 异常退出后不留孤儿转换进程
process.on('disconnect', () => process.exit(0))

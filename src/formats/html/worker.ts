import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { convertHtmlToMarkdown } from '../shared/html-output-policy.ts'
import { isHtmlConvertRequest } from './html-request.ts'
import { decodeHtmlBytes } from './server/charset.ts'

// HTML 转换子进程入口：只允许本文件 import 转换器与解码器。
// 协议：接收一个已校验的请求，回传 diagnostic / output / done / failed 帧；不写库。

function send(frame: unknown): void {
  if (process.connected && typeof process.send === 'function') process.send(frame)
}

function fail(code: 'file_too_large' | 'io_failed', message: string): never {
  send({ type: 'failed', code, message })
  process.exit(1)
}

async function convert(raw: unknown): Promise<void> {
  if (!isHtmlConvertRequest(raw)) {
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
  const decoded = decodeHtmlBytes(bytes)
  if (!decoded.ok) {
    fail('io_failed', decoded.message)
  }
  for (const warning of decoded.warnings) {
    send({ type: 'diagnostic', message: warning })
  }
  const converted = convertHtmlToMarkdown(decoded.text)
  if (converted.droppedLinkCount > 0) {
    send({ type: 'diagnostic', message: `已移除 ${converted.droppedLinkCount} 个不允许保留的链接` })
  }
  const output = Buffer.from(converted.markdown, 'utf8')
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
  void convert(raw).catch(() => fail('io_failed', 'HTML 解析失败，文件可能不是有效的 HTML 文档'))
})

// Host 异常退出后不留孤儿转换进程
process.on('disconnect', () => process.exit(0))

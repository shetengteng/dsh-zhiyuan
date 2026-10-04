import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { KbError, type KbErrorCode } from '../../model/error/kb-error.ts'
import { convertXlsxToCsvOutputs } from './sheet-to-csv.ts'
import { isXlsxConvertRequest } from './xlsx-request.ts'

// XLSX 转换子进程入口：只有 sheet-to-csv.ts 可以 import XLSX 库。
// 协议：接收一个已校验的请求，回传 diagnostic / output / done / failed 帧；不写库。

function send(frame: unknown): void {
  if (process.connected && typeof process.send === 'function') process.send(frame)
}

function fail(code: KbErrorCode, message: string): never {
  send({ type: 'failed', code, message })
  process.exit(1)
}

async function convert(raw: unknown): Promise<void> {
  if (!isXlsxConvertRequest(raw)) {
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
  const { outputs, warnings } = convertXlsxToCsvOutputs(bytes, raw)
  for (const warning of warnings) {
    send({ type: 'diagnostic', message: warning })
  }
  for (const output of outputs) {
    send({
      type: 'output',
      outputName: output.outputName,
      byteLength: output.bytes.length,
      digest: createHash('sha256').update(output.bytes).digest('hex'),
      bytes: output.bytes,
    })
  }
  send({ type: 'done' })
  // 断开 IPC 触发 disconnect，由监听器退出，避免 process.exit 截断待发送帧
  if (process.connected) process.disconnect()
}

process.on('message', (raw: unknown) => {
  void convert(raw).catch((error: unknown) => {
    // 转换层的稳定错误码原样回传；意外异常才归为 io_failed
    if (error instanceof KbError) fail(error.code, error.message)
    fail('io_failed', 'XLSX 解析失败，文件可能已损坏或不是有效的 Excel 工作簿')
  })
})

// Host 异常退出后不留孤儿转换进程
process.on('disconnect', () => process.exit(0))

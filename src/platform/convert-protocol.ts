/**
 * 转换子进程与父进程之间的有限帧契约。
 * 只定义信封，不感知具体格式；任何帧都必须先通过 isConvertWorkerFrame 收窄。
 */

/** 单个转换产物帧：bytes 长度必须与 byteLength 一致，digest 为产物字节的 sha256。 */
export type ConvertOutputFrame = {
  type: 'output'
  outputName: string
  byteLength: number
  digest: string
  bytes: Uint8Array
}

/** 给人看的转换警告；文案由子进程生成，不含源路径与文档原文。 */
export type ConvertDiagnosticFrame = { type: 'diagnostic'; message: string }

/** 子进程明确失败：code 必须落在 Host 白名单内，message 是通用文案。 */
export type ConvertFailureFrame = { type: 'failed'; code: string; message: string }

/** 终止帧：子进程发完产物后发送。 */
export type ConvertDoneFrame = { type: 'done' }

export type ConvertWorkerFrame = ConvertDiagnosticFrame | ConvertOutputFrame | ConvertFailureFrame | ConvertDoneFrame

/** 父进程允许子进程回传的错误码白名单；其余一律按 io_failed 处理。 */
export const CONVERT_FAILURE_CODES: readonly string[] = ['file_too_large', 'io_failed', 'xlsx_invalid']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFrameTypeName(value: unknown): value is ConvertWorkerFrame['type'] {
  return value === 'output' || value === 'diagnostic' || value === 'failed' || value === 'done'
}

/**
 * 帧边界收窄：复验类型、文件名（纯 basename）与字节数。
 * 不做总量累计与超时控制，那些是父进程 convert-worker 的职责。
 */
export function isConvertWorkerFrame(value: unknown): value is ConvertWorkerFrame {
  if (!isRecord(value)) return false
  if (!isFrameTypeName(value.type)) return false
  if (value.type === 'output') {
    if (typeof value.outputName !== 'string' || !value.outputName) return false
    if (value.outputName !== value.outputName.split(/[\\/]/).pop()) return false
    if (typeof value.byteLength !== 'number' || !Number.isSafeInteger(value.byteLength) || value.byteLength < 0) return false
    if (!(value.bytes instanceof Uint8Array) || value.bytes.length !== value.byteLength) return false
    if (typeof value.digest !== 'string' || !/^[0-9a-f]{64}$/.test(value.digest)) return false
  }
  if (value.type === 'diagnostic' && typeof value.message !== 'string') return false
  if (value.type === 'failed' && (typeof value.code !== 'string' || typeof value.message !== 'string')) return false
  return true
}

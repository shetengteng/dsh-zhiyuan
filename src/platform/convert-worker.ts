import { fork, type Serializable } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { KbError, type KbErrorCode } from '../model/error/kb-error.ts'
import {
  CONVERT_FAILURE_CODES,
  isConvertWorkerFrame,
  type ConvertOutputFrame,
} from './convert-protocol.ts'

// 转换子进程隔离：fork 受信任入口、30s 硬终止、逐帧复验、累计字节兜底。
// 本模块不 import 任何格式解析库；请求体由各格式模块构造并被子进程自行校验。

const CONVERT_TIMEOUT_MS = 30_000

/** 父进程接受产物的累计字节兜底：子进程发送前自检之外的最后一道闸。 */
export const CONVERT_MAX_TOTAL_BYTES = 20 * 1024 * 1024

/** 子进程入口描述：源码直跑（测试）优先 TS 源，lib 布局用构建产物。 */
export type ConvertWorkerSpec = {
  /** 构建产物文件名，与 lib 入口文件同级（如 convert-docx-worker.js）。 */
  builtFileName: string
  /** 源码子进程入口 URL，由注册模块按自身模块位置硬编码。 */
  sourceUrl: URL
}

export type IsolatedConversion = {
  outputs: ConvertOutputFrame[]
  warnings: string[]
}

function resolveWorkerEntry(spec: ConvertWorkerSpec): { entryPath: string; execArgv: string[] } {
  const sourcePath = fileURLToPath(spec.sourceUrl)
  if (existsSync(sourcePath)) {
    return { entryPath: sourcePath, execArgv: ['--experimental-strip-types'] }
  }
  const builtUrl = new URL(`./${spec.builtFileName}`, import.meta.url)
  if (existsSync(builtUrl)) return { entryPath: fileURLToPath(builtUrl), execArgv: [] }
  throw new KbError('io_failed', `转换子进程入口不存在：${spec.builtFileName}`)
}

function failureError(code: string, message: string): KbError {
  const safeCode = CONVERT_FAILURE_CODES.includes(code) ? code : 'io_failed'
  return new KbError(safeCode as KbErrorCode, message)
}

/**
 * 在一次性子进程里执行一次转换：成功返回产物与警告帧，
 * 失败（子进程 failed 帧、崩溃、超时、帧越界）抛 KbError。
 */
export function runIsolatedConversion(
  spec: ConvertWorkerSpec,
  request: unknown,
  options?: { timeoutMs?: number; maxTotalBytes?: number },
): Promise<IsolatedConversion> {
  const timeoutMs = options?.timeoutMs ?? CONVERT_TIMEOUT_MS
  const maxTotalBytes = options?.maxTotalBytes ?? CONVERT_MAX_TOTAL_BYTES
  const { entryPath, execArgv } = resolveWorkerEntry(spec)

  return new Promise<IsolatedConversion>((resolve, reject) => {
    const child = fork(entryPath, [], { execArgv, serialization: 'advanced', stdio: 'ignore' })
    const outputs: ConvertOutputFrame[] = []
    const warnings: string[] = []
    let totalBytes = 0
    let settled = false

    const finish = (error?: KbError, result?: IsolatedConversion): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.removeListener('message', onMessage)
      child.removeListener('error', onError)
      child.removeListener('exit', onExit)
      child.removeListener('disconnect', onDisconnect)
      if (child.connected) child.kill()
      if (error) reject(error)
      else resolve(result as IsolatedConversion)
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(new KbError('io_failed', '文档转换超时，已强制终止'))
    }, timeoutMs)

    const onMessage = (raw: unknown): void => {
      if (!isConvertWorkerFrame(raw)) {
        child.kill('SIGKILL')
        finish(new KbError('io_failed', '转换子进程返回了意外结果'))
        return
      }
      if (raw.type === 'diagnostic') {
        warnings.push(raw.message)
        return
      }
      if (raw.type === 'output') {
        totalBytes += raw.byteLength
        if (totalBytes > maxTotalBytes) {
          child.kill('SIGKILL')
          finish(new KbError('file_too_large', '转换产物超过大小限制'))
          return
        }
        outputs.push(raw)
        return
      }
      if (raw.type === 'failed') {
        finish(failureError(raw.code, raw.message))
        return
      }
      // done 帧允许零产出：是否视为跳过由调用方按格式语义决定（如全部 sheet 被隐藏）
      finish(undefined, { outputs, warnings })
    }

    const onError = (): void => finish(new KbError('io_failed', '转换子进程无法启动'))
    const onExit = (code: number | null): void => {
      if (!settled) finish(new KbError('io_failed', `转换子进程提前退出（${code ?? '未知'}）`))
    }
    const onDisconnect = (): void => {
      if (!settled) finish(new KbError('io_failed', '转换子进程断开连接'))
    }

    child.on('message', onMessage)
    child.on('error', onError)
    child.on('exit', onExit)
    child.on('disconnect', onDisconnect)
    // request 由注册模块硬编码构造，不是用户可控数据
    child.send(request as Serializable)
  })
}

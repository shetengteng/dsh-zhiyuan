import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  KNOWLEDGE_RPC_CHANNEL,
  type KnowledgeRpcEnvelope,
} from '../../model/wire/knowledge-rpc-contract.ts'

/**
 * DSH 私有 RPC 的 Host 侧承载。
 *
 * DSH 0.1.5-rc.2 起，`ctx.connection.rpc.handle()` 挂载插件通道时会去读 connection
 * 自身 ctx 上的 `webServer`，而该 ctx 已不再声明注入 webServer，于是必然抛
 * `cannot get property "webServer" without inject`：通道没注册，浏览器请求落到
 * SPA 兜底并得到 HTTP 405。
 *
 * 这里改为把同一条前缀路由直接挂到 DSH 已有的 webServer 上（不自建 HTTP 服务），
 * 并复刻 client-request / server-response 信封，让 Client 侧继续用
 * `ctx.connection.rpc.call` 而无需改动；Host/Origin 与浏览器会话校验仍复用
 * connection 自己的 requestRejection。
 */

/** 单个请求体上限：知源 RPC 只传路径、ID 和游标，1 MiB 足够。 */
const MAX_REQUEST_BODY_BYTES = 1024 * 1024

/** endpoint 段合法性，与 DSH connection 通道的约束保持一致。 */
const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/

export type KnowledgeRpcHandler = (
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
) => Promise<KnowledgeRpcEnvelope<unknown>>

export type KnowledgeWebServerRoute = {
  kind: 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
}

/** webServer 的最小契约：只用到前缀路由注册。 */
export type KnowledgeWebServer = {
  register: (route: KnowledgeWebServerRoute) => () => void
}

/** connection 的最小契约：只用到 Host/Origin 与浏览器会话校验。 */
export type KnowledgeConnectionFence = {
  requestRejection: (req: IncomingMessage) => number | undefined
}

type ClientRequestEnvelope = {
  rpcId: string
  method: string
  payload: unknown
}

type BodyReadResult =
  | { ok: true; value: unknown }
  | { ok: false; status: number; message: string }

function sendText(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' })
  res.end(message)
}

function sendResult(res: ServerResponse, rpcId: string, result: unknown): void {
  const body = JSON.stringify({ type: 'server-response', rpcId, result })
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

function badRequest(message: string): KnowledgeRpcEnvelope<never> {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function endpointFromUrl(rawUrl: string | undefined): string | undefined {
  const pathname = new URL(rawUrl ?? '/', 'http://localhost').pathname
  if (!pathname.startsWith(`${KNOWLEDGE_RPC_CHANNEL}/`)) return undefined
  const endpoint = pathname.slice(KNOWLEDGE_RPC_CHANNEL.length + 1)
  const segments = endpoint.split('/')
  if (segments.some((segment) => !ENDPOINT_SEGMENT_PATTERN.test(segment))) return undefined
  return endpoint
}

async function readJsonBody(req: IncomingMessage): Promise<BodyReadResult> {
  const chunks: Buffer[] = []
  let total = 0
  const stream: AsyncIterable<Buffer | string> = req
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      total += buffer.byteLength
      if (total > MAX_REQUEST_BODY_BYTES) return { ok: false, status: 413, message: '请求体过大' }
      chunks.push(buffer)
    }
  } catch {
    return { ok: false, status: 400, message: '请求体读取失败' }
  }
  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  } catch {
    return { ok: false, status: 400, message: '请求体不是 JSON' }
  }
}

function parseClientRequest(body: unknown): ClientRequestEnvelope | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  const record = body as Record<string, unknown>
  if (record.type !== 'client-request') return undefined
  if (typeof record.rpcId !== 'string' || typeof record.method !== 'string') return undefined
  return { rpcId: record.rpcId, method: record.method, payload: record.payload }
}

/**
 * 把知源 RPC 前缀路由挂到 DSH webServer 上。
 * 返回的 disposer 由调用方持有，插件卸载时调用。
 */
export function registerKnowledgeRpcRoute(
  webServer: KnowledgeWebServer,
  fence: KnowledgeConnectionFence,
  handler: KnowledgeRpcHandler,
): () => void {
  return webServer.register({
    kind: 'prefix',
    path: KNOWLEDGE_RPC_CHANNEL,
    handler: async (req, res) => {
      const rejection = fence.requestRejection(req)
      if (rejection !== undefined) {
        sendText(res, rejection, rejection === 401 ? 'unauthorized' : 'forbidden')
        return
      }
      const endpoint = endpointFromUrl(req.url)
      if (req.method !== 'POST' || endpoint === undefined) {
        sendText(res, 404, 'not found')
        return
      }
      const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
      if (contentType !== 'application/json') {
        sendText(res, 415, 'content type must be application/json')
        return
      }
      const body = await readJsonBody(req)
      if (!body.ok) {
        sendText(res, body.status, body.message)
        return
      }
      const message = parseClientRequest(body.value)
      if (message === undefined) {
        sendResult(res, 'invalid-request', badRequest('invalid client-request message'))
        return
      }
      if (message.method !== endpoint) {
        sendResult(res, message.rpcId, badRequest('请求方法与应用端点不一致'))
        return
      }
      const controller = new AbortController()
      res.on('close', () => controller.abort())
      try {
        sendResult(res, message.rpcId, await handler(endpoint, message.payload, controller.signal))
      } catch (error) {
        sendText(res, 500, `handler failure: ${String(error)}`)
      }
    },
  })
}
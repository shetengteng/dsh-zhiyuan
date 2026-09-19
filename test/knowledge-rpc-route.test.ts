import assert from 'node:assert/strict'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { test } from 'node:test'
import { registerKnowledgeRpcRoute } from '../src/controller/rpc/knowledge-rpc-route.ts'
import { KNOWLEDGE_RPC_CHANNEL } from '../src/model/wire/knowledge-rpc-contract.ts'

type CapturedResponse = {
  status: number
  body: string
  contentType: string | undefined
  close: () => void
}

function createRequest(options: { method: string; url: string; contentType?: string; chunks?: Buffer[] }): IncomingMessage {
  const chunks = options.chunks ?? []
  const request = {
    method: options.method,
    url: options.url,
    headers: options.contentType === undefined ? {} : { 'content-type': options.contentType },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
  return request as unknown as IncomingMessage
}

function createResponse(): { res: ServerResponse; captured: CapturedResponse } {
  let closeListener: (() => void) | undefined
  const captured: CapturedResponse = {
    status: 0,
    body: '',
    contentType: undefined,
    close: () => closeListener?.(),
  }
  const res = {
    writeHead: (status: number, headers?: Record<string, string>) => {
      captured.status = status
      captured.contentType = headers?.['content-type']
      return res
    },
    end: (body?: string) => {
      captured.body = body ?? ''
      return res
    },
    on: (event: string, listener: () => void) => {
      if (event === 'close') closeListener = listener
      return res
    },
  }
  return { res: res as unknown as ServerResponse, captured }
}

function jsonBody(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8')
}

function envelope(method: string, payload: unknown): Buffer {
  return jsonBody({ type: 'client-request', rpcId: 'rpc-9', method, payload })
}

/** 注册一次前缀路由，返回可断言的 route 与解绑标记。 */
function registerRoute(options: {
  rejection?: number
  handler: Parameters<typeof registerKnowledgeRpcRoute>[2]
}): { handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>; dispose: () => void; disposed: () => boolean } {
  let registered: { handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> } | undefined
  let disposed = false
  const dispose = registerKnowledgeRpcRoute(
    {
      register: (route) => {
        registered = route
        return () => {
          disposed = true
        }
      },
    },
    { requestRejection: () => options.rejection },
    options.handler,
  )
  if (!registered) throw new Error('知源 RPC 前缀路由未注册')
  return { handler: registered.handler, dispose, disposed: () => disposed }
}

const echoHandler: Parameters<typeof registerKnowledgeRpcRoute>[2] = async (endpoint, payload, signal) => ({
  ok: true,
  value: { endpoint, payload, aborted: signal.aborted },
})

test('RPC 路由：通道与会话校验先于请求解析', async () => {
  const unauthorized = registerRoute({ rejection: 401, handler: echoHandler })
  const unauthorizedResponse = createResponse()
  await unauthorized.handler(
    createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/operation`, contentType: 'application/json' }),
    unauthorizedResponse.res,
  )
  assert.equal(unauthorizedResponse.captured.status, 401)
  assert.equal(unauthorizedResponse.captured.body, 'unauthorized')
  unauthorized.dispose()
  assert.equal(unauthorized.disposed(), true)

  const forbidden = registerRoute({ rejection: 403, handler: echoHandler })
  const forbiddenResponse = createResponse()
  await forbidden.handler(createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/operation` }), forbiddenResponse.res)
  assert.equal(forbiddenResponse.captured.status, 403)
  assert.equal(forbiddenResponse.captured.body, 'forbidden')
  forbidden.dispose()
})

test('RPC 路由：方法、路径与端点段不合法一律 404', async () => {
  const route = registerRoute({ handler: echoHandler })
  try {
    const notPost = createResponse()
    await route.handler(createRequest({ method: 'GET', url: `${KNOWLEDGE_RPC_CHANNEL}/operation` }), notPost.res)
    assert.equal(notPost.captured.status, 404)

    const otherChannel = createResponse()
    await route.handler(createRequest({ method: 'POST', url: '/other/operation', contentType: 'application/json' }), otherChannel.res)
    assert.equal(otherChannel.captured.status, 404)

    const channelRoot = createResponse()
    await route.handler(createRequest({ method: 'POST', url: KNOWLEDGE_RPC_CHANNEL, contentType: 'application/json' }), channelRoot.res)
    assert.equal(channelRoot.captured.status, 404)

    const illegalSegment = createResponse()
    await route.handler(
      createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/a%20b`, contentType: 'application/json' }),
      illegalSegment.res,
    )
    assert.equal(illegalSegment.captured.status, 404)
  } finally {
    route.dispose()
  }
})

test('RPC 路由：请求体守卫与信封解析', async () => {
  const route = registerRoute({ handler: echoHandler })
  try {
    const wrongType = createResponse()
    await route.handler(
      createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/operation`, contentType: 'text/plain', chunks: [Buffer.from('{}')] }),
      wrongType.res,
    )
    assert.equal(wrongType.captured.status, 415)

    const brokenJson = createResponse()
    await route.handler(
      createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/operation`, contentType: 'application/json', chunks: [Buffer.from('not json')] }),
      brokenJson.res,
    )
    assert.equal(brokenJson.captured.status, 400)

    // 超过 1 MiB 的请求体在读取阶段就被拒绝
    const tooLarge = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/operation`,
        contentType: 'application/json',
        chunks: [Buffer.alloc(1024 * 1024 + 1, 0x61)],
      }),
      tooLarge.res,
    )
    assert.equal(tooLarge.captured.status, 413)

    const notClientRequest = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/operation`,
        contentType: 'application/json',
        chunks: [jsonBody({ type: 'server-response', rpcId: 'rpc-9' })],
      }),
      notClientRequest.res,
    )
    assert.equal(notClientRequest.captured.status, 200)
    const invalidResult = JSON.parse(notClientRequest.captured.body)
    assert.equal(invalidResult.rpcId, 'invalid-request')
    assert.equal(invalidResult.result.ok, false)
  } finally {
    route.dispose()
  }
})

test('RPC 路由：方法名必须与应用端点一致', async () => {
  const route = registerRoute({ handler: echoHandler })
  try {
    const mismatched = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/operation`,
        contentType: 'application/json',
        chunks: [envelope('status', {})],
      }),
      mismatched.res,
    )
    assert.equal(mismatched.captured.status, 200)
    const result = JSON.parse(mismatched.captured.body)
    assert.equal(result.rpcId, 'rpc-9')
    assert.equal(result.result.ok, false)
    assert.match(result.result.error.message, /不一致/)
  } finally {
    route.dispose()
  }
})

test('RPC 路由：命中端点时透传 payload、带 charset 的 content-type 可接受、响应关闭时中止', async () => {
  const route = registerRoute({ handler: echoHandler })
  try {
    const accepted = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/operation`,
        contentType: 'application/json; charset=utf-8',
        chunks: [envelope('operation', { op: 'list' })],
      }),
      accepted.res,
    )
    assert.equal(accepted.captured.status, 200)
    assert.equal(accepted.captured.contentType, 'application/json')
    assert.deepEqual(JSON.parse(accepted.captured.body), {
      type: 'server-response',
      rpcId: 'rpc-9',
      result: { ok: true, value: { endpoint: 'operation', payload: { op: 'list' }, aborted: false } },
    })
    // 请求结束后再触发 close，说明 handler 收到的是真实 AbortSignal
    accepted.captured.close()
  } finally {
    route.dispose()
  }
})

test('RPC 路由：客户取消请求时 handler 收到已中止的 signal', async () => {
  // handler 停在闸门上，等响应关闭后再放行，从而稳定观察到 abort
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const route = registerRoute({
    handler: async (_endpoint, _payload, signal) => {
      await gate
      return { ok: true, value: { aborted: signal.aborted } }
    },
  })
  try {
    const response = createResponse()
    const pending = route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/operation`,
        contentType: 'application/json',
        chunks: [envelope('operation', {})],
      }),
      response.res,
    )
    // 让请求体读完并进入 handler，再模拟浏览器断开
    await new Promise((resolve) => setTimeout(resolve, 0))
    response.captured.close()
    release()
    await pending
    assert.equal(JSON.parse(response.captured.body).result.value.aborted, true)
  } finally {
    route.dispose()
  }
})

test('RPC 路由：handler 抛错时返回 500 文本', async () => {
  const route = registerRoute({
    handler: async () => {
      throw new Error('内部失败')
    },
  })
  try {
    const response = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/operation`,
        contentType: 'application/json',
        chunks: [envelope('operation', {})],
      }),
      response.res,
    )
    assert.equal(response.captured.status, 500)
    assert.match(response.captured.body, /handler failure: Error: 内部失败/)
  } finally {
    route.dispose()
  }
})
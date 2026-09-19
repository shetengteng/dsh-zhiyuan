import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { registerKnowledgePrivateRpc } from '../src/controller/rpc/knowledge-rpc-controller.ts'
import type { KnowledgeWebServerRoute } from '../src/controller/rpc/knowledge-rpc-route.ts'
import { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from '../src/model/wire/knowledge-rpc-contract.ts'
import { createJobRunner } from '../src/platform/jobs.ts'
import { setDataRootForTest } from '../src/platform/paths.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from '../src/service/kb/knowledge-services.ts'

const knowledgeServices = createKnowledgeServices(new FileCatalogRepository())

type CapturedResponse = { status: number; body: string; ended: boolean }

function createRequest(options: { method: string; url: string; contentType?: string; body?: string }): IncomingMessage {
  const chunks = options.body === undefined ? [] : [Buffer.from(options.body, 'utf8')]
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
  const captured: CapturedResponse = { status: 0, body: '', ended: false }
  const res = {
    writeHead: (status: number) => {
      captured.status = status
      return res
    },
    end: (body?: string) => {
      captured.body = body ?? ''
      captured.ended = true
      return res
    },
    on: () => res,
  }
  return { res: res as unknown as ServerResponse, captured }
}

function callEnvelope(method: string, payload: unknown): string {
  return JSON.stringify({ type: 'client-request', rpcId: 'rpc-1', method, payload })
}

function registerRoute(rejection: number | undefined): {
  route: KnowledgeWebServerRoute
  dispose: () => void
  disposed: () => boolean
  fenceChecks: () => number
} {
  let route: KnowledgeWebServerRoute | undefined
  let disposed = false
  let fenceChecks = 0
  const dispose = registerKnowledgePrivateRpc({
    webServer: {
      register: (nextRoute) => {
        route = nextRoute
        return () => {
          disposed = true
        }
      },
    },
    connection: {
      requestRejection: () => {
        fenceChecks += 1
        return rejection
      },
    },
  }, createJobRunner(), knowledgeServices)
  if (!route) throw new Error('私有 RPC 未注册')
  return { route, dispose, disposed: () => disposed, fenceChecks: () => fenceChecks }
}

test('私有 RPC：登记 /zhiyuan 前缀路由并分派 operation 与 status', { concurrency: false }, async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'zy-private-rpc-'))
  setDataRootForTest(dataRoot)
  try {
    const { route, dispose, disposed } = registerRoute(undefined)
    assert.equal(route.kind, 'prefix')
    assert.equal(route.path, KNOWLEDGE_RPC_CHANNEL)

    const operation = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_OPERATION_ENDPOINT}`,
        contentType: 'application/json',
        body: callEnvelope(KNOWLEDGE_OPERATION_ENDPOINT, { op: 'list' }),
      }),
      operation.res,
    )
    assert.equal(operation.captured.status, 200)
    assert.deepEqual(JSON.parse(operation.captured.body), {
      type: 'server-response',
      rpcId: 'rpc-1',
      result: { ok: true, value: [] },
    })

    const status = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_STATUS_ENDPOINT}`,
        contentType: 'application/json',
        body: callEnvelope(KNOWLEDGE_STATUS_ENDPOINT, {}),
      }),
      status.res,
    )
    assert.deepEqual(JSON.parse(status.captured.body).result, {
      ok: true,
      value: { running: false, failed: [] },
    })

    const unknown = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/unknown`,
        contentType: 'application/json',
        body: callEnvelope('unknown', {}),
      }),
      unknown.res,
    )
    const unknownResult = JSON.parse(unknown.captured.body).result as { ok: boolean; error?: { message?: string } }
    assert.equal(unknownResult.ok, false)
    assert.match(unknownResult.error?.message ?? '', /未知知源 RPC 端点/)

    dispose()
    assert.equal(disposed(), true)
  } finally {
    setDataRootForTest(undefined)
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('私有 RPC：鉴权、路径、方法、请求体与信封守卫', { concurrency: false }, async () => {
  const rejected = registerRoute(403)
  const rejectedResponse = createResponse()
  await rejected.route.handler(
    createRequest({
      method: 'POST',
      url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_OPERATION_ENDPOINT}`,
      contentType: 'application/json',
      body: callEnvelope(KNOWLEDGE_OPERATION_ENDPOINT, { op: 'list' }),
    }),
    rejectedResponse.res,
  )
  assert.equal(rejectedResponse.captured.status, 403)
  assert.equal(rejected.fenceChecks(), 1)
  rejected.dispose()

  const { route, dispose } = registerRoute(undefined)
  try {
    const notPost = createResponse()
    await route.handler(createRequest({ method: 'GET', url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_OPERATION_ENDPOINT}` }), notPost.res)
    assert.equal(notPost.captured.status, 404)

    const otherPath = createResponse()
    await route.handler(createRequest({ method: 'POST', url: '/other/operation', contentType: 'application/json', body: '{}' }), otherPath.res)
    assert.equal(otherPath.captured.status, 404)

    const wrongType = createResponse()
    await route.handler(
      createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_OPERATION_ENDPOINT}`, contentType: 'text/plain', body: '{}' }),
      wrongType.res,
    )
    assert.equal(wrongType.captured.status, 415)

    const brokenJson = createResponse()
    await route.handler(
      createRequest({ method: 'POST', url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_OPERATION_ENDPOINT}`, contentType: 'application/json', body: 'not json' }),
      brokenJson.res,
    )
    assert.equal(brokenJson.captured.status, 400)

    const mismatched = createResponse()
    await route.handler(
      createRequest({
        method: 'POST',
        url: `${KNOWLEDGE_RPC_CHANNEL}/${KNOWLEDGE_OPERATION_ENDPOINT}`,
        contentType: 'application/json',
        body: callEnvelope(KNOWLEDGE_STATUS_ENDPOINT, {}),
      }),
      mismatched.res,
    )
    assert.equal(mismatched.captured.status, 200)
    assert.equal(JSON.parse(mismatched.captured.body).result.ok, false)
  } finally {
    dispose()
  }
})
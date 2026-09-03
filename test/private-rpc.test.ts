import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createJobRunner } from '../src/jobs.ts'
import { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from '../src/private-rpc-contract.ts'
import { registerKnowledgePrivateRpc } from '../src/private-rpc.ts'
import { setDataRootForTest } from '../src/paths.ts'

test('私有 RPC：只登记 loopback 通道，并分发操作和任务状态', { concurrency: false }, async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'zy-private-rpc-'))
  let channel = ''
  let authority = ''
  let handler: ((endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>) | undefined
  let disposed = false
  setDataRootForTest(dataRoot)
  try {
    const dispose = registerKnowledgePrivateRpc({
      connection: {
        rpc: {
          handle: (nextChannel, nextHandler, options) => {
            channel = nextChannel
            authority = options.authority
            handler = nextHandler
            return async () => { disposed = true }
          },
        },
      },
    }, createJobRunner())
    if (!handler) throw new Error('私有 RPC 未注册')

    assert.equal(channel, KNOWLEDGE_RPC_CHANNEL)
    assert.equal(authority, 'loopback')
    assert.deepEqual(await handler(KNOWLEDGE_OPERATION_ENDPOINT, { op: 'list' }, new AbortController().signal), {
      ok: true,
      value: [],
    })
    assert.deepEqual(await handler(KNOWLEDGE_STATUS_ENDPOINT, {}, new AbortController().signal), {
      ok: true,
      value: { running: false, op: undefined, failed: [] },
    })
    const unknown = await handler('unknown', {}, new AbortController().signal) as { ok: boolean; error?: { message?: string } }
    assert.equal(unknown.ok, false)
    assert.match(unknown.error?.message ?? '', /未知知源 RPC 端点/)

    await dispose()
    assert.equal(disposed, true)
  } finally {
    setDataRootForTest(undefined)
    await rm(dataRoot, { recursive: true, force: true })
  }
})

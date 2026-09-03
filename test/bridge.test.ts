import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from '../src/private-rpc-contract.ts'
import { callKnowledgeHost, getKnowledgeJobStatus, type KnowledgePrivateConnection } from '../src/client/bridge.ts'

test('私有 bridge：所有设置操作走独立 channel，不需要会话', async () => {
  const calls: Array<{ channel: string; endpoint: string; payload: unknown; signal?: AbortSignal }> = []
  const signal = new AbortController().signal
  const connection: KnowledgePrivateConnection = {
    rpc: {
      call: async (channel, endpoint, payload, requestSignal) => {
        calls.push({ channel, endpoint, payload, signal: requestSignal })
        return { ok: true, value: endpoint === KNOWLEDGE_STATUS_ENDPOINT ? { running: false, failed: [] } : { bases: [] } }
      },
    },
  }

  assert.deepEqual(await callKnowledgeHost(connection, { op: 'list' }, signal), { bases: [] })
  assert.deepEqual(await getKnowledgeJobStatus(connection), { running: false, failed: [] })
  assert.deepEqual(calls, [
    { channel: KNOWLEDGE_RPC_CHANNEL, endpoint: KNOWLEDGE_OPERATION_ENDPOINT, payload: { op: 'list' }, signal },
    { channel: KNOWLEDGE_RPC_CHANNEL, endpoint: KNOWLEDGE_STATUS_ENDPOINT, payload: {}, signal: undefined },
  ])
})

test('私有 bridge：断连、Host 失败和非法 envelope 都可见', async () => {
  await assert.rejects(() => callKnowledgeHost(undefined, { op: 'list' }), /私有 RPC 不可用/)

  const failure: KnowledgePrivateConnection = {
    rpc: { call: async () => ({ ok: false, error: { code: 'internal', message: '拒绝访问' } }) },
  }
  await assert.rejects(() => callKnowledgeHost(failure, { op: 'list' }), /拒绝访问/)

  const invalid: KnowledgePrivateConnection = { rpc: { call: async () => ({ result: 'bad' }) } }
  await assert.rejects(() => getKnowledgeJobStatus(invalid), /返回无效/)
})

import type { JobRunner } from './jobs.ts'
import { executeKnowledgeOperation } from './ui-operations.ts'
import { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from './private-rpc-contract.ts'

export { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from './private-rpc-contract.ts'

type RpcResult = {
  ok: true
  value: unknown
} | {
  ok: false
  error: { code: 'internal'; message: string; details: Record<never, never> }
}

type PrivateRpcContext = {
  connection: {
    rpc: {
      handle: (
        channel: string,
        handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<RpcResult>,
        options: { authority: 'loopback' },
      ) => () => Promise<void>
    }
  }
}

function failure(error: unknown): RpcResult {
  const message = error instanceof Error ? error.message : '知源请求失败'
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

/**
 * Registers the browser-only knowledge-base channel. DSH owns the returned
 * registration through the current injected fiber, so it is removed when the
 * plugin or connection reloads.
 */
export function registerKnowledgePrivateRpc(ctx: PrivateRpcContext, jobs: JobRunner): () => Promise<void> {
  return ctx.connection.rpc.handle(KNOWLEDGE_RPC_CHANNEL, async (endpoint, payload, signal) => {
    if (signal.aborted) return failure(new Error('请求已取消'))
    try {
      if (endpoint === KNOWLEDGE_OPERATION_ENDPOINT) {
        return { ok: true, value: await executeKnowledgeOperation(payload, jobs) }
      }
      if (endpoint === KNOWLEDGE_STATUS_ENDPOINT) return { ok: true, value: jobs.status() }
      return failure(new Error('未知知源 RPC 端点'))
    } catch (error) {
      return failure(error)
    }
  }, { authority: 'loopback' })
}

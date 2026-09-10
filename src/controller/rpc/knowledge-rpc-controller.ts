import {
  KNOWLEDGE_OPERATION_ENDPOINT,
  KNOWLEDGE_RPC_CHANNEL,
  KNOWLEDGE_STATUS_ENDPOINT,
  type KnowledgeRpcEnvelope,
} from '../../model/wire/knowledge-rpc-contract.ts'
import type { JobRunner } from '../../platform/jobs.ts'
import type { KnowledgeServices } from '../../service/kb/knowledge-services.ts'
import { executeKnowledgeOperation } from './knowledge-operation-controller.ts'

export { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from '../../model/wire/knowledge-rpc-contract.ts'

type PrivateRpcContext = {
  connection: {
    rpc: {
      handle: (
        channel: string,
        handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<KnowledgeRpcEnvelope<unknown>>,
        options: { authority: 'loopback' },
      ) => () => Promise<void>
    }
  }
}

function failure(error: unknown): KnowledgeRpcEnvelope<never> {
  const message = error instanceof Error ? error.message : '知源请求失败'
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

/**
 * 登记仅浏览器使用的知识库通道。DSH 通过当前注入的 fiber 持有返回的注册，
 * 插件或连接重载时会卸掉。
 */
export function registerKnowledgePrivateRpc(
  ctx: PrivateRpcContext,
  jobs: JobRunner,
  knowledgeServices: KnowledgeServices,
): () => Promise<void> {
  return ctx.connection.rpc.handle(KNOWLEDGE_RPC_CHANNEL, async (endpoint, payload, signal) => {
    if (signal.aborted) return failure(new Error('请求已取消'))
    try {
      if (endpoint === KNOWLEDGE_OPERATION_ENDPOINT) {
        return { ok: true, value: await executeKnowledgeOperation(payload, jobs, knowledgeServices) }
      }
      if (endpoint === KNOWLEDGE_STATUS_ENDPOINT) return { ok: true, value: jobs.status() }
      return failure(new Error('未知知源 RPC 端点'))
    } catch (error) {
      return failure(error)
    }
  }, { authority: 'loopback' })
}

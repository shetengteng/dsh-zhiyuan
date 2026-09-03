import { KNOWLEDGE_OPERATION_ENDPOINT, KNOWLEDGE_RPC_CHANNEL, KNOWLEDGE_STATUS_ENDPOINT } from '../private-rpc-contract.ts'

type RpcResult = {
  ok: true
  value: unknown
} | {
  ok: false
  error: { message?: string; code?: string }
}

export type KnowledgePrivateConnection = {
  rpc?: {
    call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>
  }
}

function unwrapPrivateResult(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('ok' in value)) {
    throw new Error('Host RPC 返回无效')
  }
  const result = value as RpcResult
  if (result.ok) return result.value
  throw new Error(result.error?.message || result.error?.code || '知源请求失败')
}

function requireRpc(connection?: KnowledgePrivateConnection): NonNullable<KnowledgePrivateConnection['rpc']> {
  const rpc = connection?.rpc
  if (typeof rpc?.call !== 'function') throw new Error('断连：知源私有 RPC 不可用')
  return rpc
}

export async function callKnowledgeHost(
  connection: KnowledgePrivateConnection | undefined,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  return unwrapPrivateResult(await requireRpc(connection).call(
    KNOWLEDGE_RPC_CHANNEL,
    KNOWLEDGE_OPERATION_ENDPOINT,
    payload,
    signal,
  ))
}

export async function getKnowledgeJobStatus(connection: KnowledgePrivateConnection | undefined): Promise<unknown> {
  return unwrapPrivateResult(await requireRpc(connection).call(
    KNOWLEDGE_RPC_CHANNEL,
    KNOWLEDGE_STATUS_ENDPOINT,
    {},
  ))
}

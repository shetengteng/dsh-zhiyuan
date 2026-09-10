/** Host 与 View 共享的 loopback RPC 传输契约。 */
export const KNOWLEDGE_RPC_CHANNEL = '/zhiyuan'
export const KNOWLEDGE_OPERATION_ENDPOINT = 'operation'
export const KNOWLEDGE_STATUS_ENDPOINT = 'status'

export type KnowledgeRpcEndpoint =
  | typeof KNOWLEDGE_OPERATION_ENDPOINT
  | typeof KNOWLEDGE_STATUS_ENDPOINT

/** 保持现有 Host 失败 envelope 的字段和值，不暴露内部业务错误码。 */
export type KnowledgeRpcError = {
  code: 'internal'
  message: string
  details: Record<never, never>
}

export type KnowledgeRpcEnvelope<T> =
  | { ok: true; value: T }
  | { ok: false; error: KnowledgeRpcError }

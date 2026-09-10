import type { KbSummaryResponse, KbTreeNodeResponse } from '../types.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isKbSummaryResponse(value: unknown): value is KbSummaryResponse {
  const base = asRecord(value)
  return Boolean(base
    && typeof base.id === 'string'
    && typeof base.title === 'string'
    && typeof base.description === 'string'
    && isStringArray(base.aliases)
    && isFiniteTimestamp(base.createdAt)
    && isFiniteTimestamp(base.lastUsedAt)
    && (base.lastDestCategory === undefined || typeof base.lastDestCategory === 'string')
    && isStringArray(base.categories)
    && isNonNegativeInteger(base.approxDocs)
    && typeof base.lastUsed === 'boolean')
}

/** 收窄 Host 返回的知识库列表，避免未校验对象进入工作台状态。 */
export function parseKbList(value: unknown): KbSummaryResponse[] {
  if (!Array.isArray(value) || !value.every(isKbSummaryResponse)) {
    throw new Error('Host 返回的知识库列表无效')
  }
  return value
}

function parseKbTreeNodeResponse(value: unknown): KbTreeNodeResponse {
  const pending: unknown[] = [value]
  for (let index = 0; index < pending.length; index += 1) {
    const node = asRecord(pending[index])
    if (!node || typeof node.name !== 'string' || (node.kind !== 'dir' && node.kind !== 'file') || typeof node.path !== 'string'
      || (node.size !== undefined && !isNonNegativeInteger(node.size))
      || (node.mtime !== undefined && !isFiniteTimestamp(node.mtime))) {
      throw new Error('Host 返回的知识库目录树无效')
    }
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) throw new Error('Host 返回的知识库目录树无效')
      pending.push(...node.children)
    }
  }
  return value as KbTreeNodeResponse
}

/** 收窄 Host 返回的目录树；递归检查每个节点及其子节点。 */
export function parseKbTree(value: unknown): KbTreeNodeResponse[] {
  if (!Array.isArray(value)) throw new Error('Host 返回的知识库目录树无效')
  return value.map(parseKbTreeNodeResponse)
}

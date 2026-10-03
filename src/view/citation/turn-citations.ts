import { parseSearchResult } from '../payload/search-result.ts'
import type { SearchHit } from '../types.ts'

/** turn data 的键；与折叠定义的 kind 一致，客户端经 turn.data.get('zhiyuan') 读取。 */
export const TURN_DATA_KEY = 'zhiyuan'

/** 展示上限：超出后引用条以「……另有 N 条」收尾，避免单条答案拖出上百个 chip。 */
export const MAX_TAIL_CITATIONS = 20

/** 状态里最多保留的引用条数；fold 只增不减，超出即丢弃最早的，防止长会话膨胀。 */
const MAX_STATE_CITATIONS = 50

/** 一条可点击引用：命中本身加上它所属的知识库。 */
export type TailCitation = {
  kbId: string
  hit: SearchHit
}

/** 发布到 turn data 上的业务值。 */
export type ZhiyuanTurnCitations = {
  turn: number
  citations: TailCitation[]
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function asTurn(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

/**
 * 从 tool/result 事件的 meta 里收窄出 kb_search 的 file-detail 结果。
 * meta 由 Host 的 presentationMeta 随会话日志持久化，形状与完整结果一致；
 * 收窄失败（旧数据、overview、错误结果）一律返回 null，不产出引用。
 */
function citationsFromMeta(meta: unknown): TailCitation[] | null {
  const record = asRecord(meta)
  if (!record || record.kind !== 'file-detail' || record.scope !== 'hits') return null
  // parseSearchResult 对无效输入直接抛错；meta 属于外部数据，这里按约定回退为无引用。
  let parsed: ReturnType<typeof parseSearchResult>
  try {
    parsed = parseSearchResult(record)
  } catch {
    return null
  }
  if (parsed.kind !== 'file-detail' || parsed.hits.length === 0) return null
  // 跨事件的重复由 withCitations 去重，这里只做一次结果内映射。
  return parsed.hits.map((hit) => ({ kbId: parsed.kbId, hit }))
}

function withCitations(state: ZhiyuanTurnState, added: TailCitation[]): ZhiyuanTurnState {
  if (added.length === 0) return state
  // 事件可能重放，同一命中以复合键去重；超出上限丢弃最早的。
  const seen = new Set(state.citations.map(citationKeyOf))
  const merged = [...state.citations]
  for (const citation of added) {
    const key = citationKeyOf(citation)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(citation)
  }
  return { ...state, citations: merged.slice(-MAX_STATE_CITATIONS) }
}

function citationKeyOf(citation: TailCitation): string {
  return `${citation.kbId}|${citation.hit.path}|${citation.hit.startLine}|${citation.hit.endLine}|${citation.hit.matchLine}|${citation.hit.n}`
}

/** 折叠过程中的中间状态；citations 是去重后的命中，闭包给 buildLocationData 发布。 */
type ZhiyuanTurnState = ZhiyuanTurnCitations

/** 会话事件的最小结构视图；数据来自会话日志，使用前必须逐字段收窄。 */
type FoldEvent = {
  type: string
  seq: number
  surfaceOp?: string
  data: unknown
}

type FoldMatch = {
  id: string
  role: 'start' | 'update'
  event: FoldEvent
}

/** 折叠定义的最小结构契约，对齐 DSH ConversationNodeDefinition 的使用面。 */
export type ZhiyuanCitationsDefinition = {
  kind: string
  match: (event: unknown) => { id: string; role: 'start' | 'update' } | null
  start: (context: unknown, match: FoldMatch) => ZhiyuanTurnState
  update: (context: { state: ZhiyuanTurnState }, match: FoldMatch) => ZhiyuanTurnState
  buildLocationData: (
    context: { state: ZhiyuanTurnState | undefined },
    scope: string,
    previous: { kind: 'turn'; turn: number; key: string; value: ZhiyuanTurnCitations } | null,
  ) => { kind: 'turn'; turn: number; key: string; value: ZhiyuanTurnCitations } | null
}

/**
 * 把 kb_search 的检索结果折叠进每轮 turn data，供答案下方的引用条读取。
 * 只认 tool/result 且 surfaceOp 为 append 的事件；meta 缺失或形状不符的轮次不产出引用。
 */
export function createZhiyuanCitationsDefinition(): ZhiyuanCitationsDefinition {
  return {
    kind: TURN_DATA_KEY,
    match: (event) => {
      const record = asRecord(event)
      if (!record || typeof record.type !== 'string') return null
      const turnId = `zhiyuan:${String(asRecord(record.data)?.turn ?? '')}`
      if (record.type === 'turn/start') return { id: turnId, role: 'start' }
      if (record.type === 'tool/result' && record.surfaceOp === 'append') {
        return { id: turnId, role: 'update' }
      }
      return null
    },
    start: (_context, match) => {
      const turn = asTurn(asRecord(match.event.data)?.turn) ?? 0
      return { turn, citations: [] }
    },
    update: (context, match) => {
      const data = asRecord(match.event.data)
      if (asTurn(data?.turn) !== context.state.turn) return context.state
      const message = asRecord(data?.message)
      if (message?.isError === true) return context.state
      const added = citationsFromMeta(data?.meta)
      return added === null ? context.state : withCitations(context.state, added)
    },
    buildLocationData: (context, scope, previous) => {
      const state = context.state
      // 没有引用时直接不发布：答案下方不占位，也避免无检索的轮次挂空值。
      if (scope !== 'turn' || state === undefined || state.citations.length === 0) return null
      // 值就是 state 本身：状态未变时按身份返回 previous，避免下游无谓重渲染。
      const record = asRecord(previous)
      if (record?.kind === 'turn' && record.key === TURN_DATA_KEY && record.value === state) return previous
      return { kind: 'turn', turn: state.turn, key: TURN_DATA_KEY, value: state }
    },
  }
}

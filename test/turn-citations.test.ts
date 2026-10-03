import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createZhiyuanCitationsDefinition,
  TURN_DATA_KEY,
  type ZhiyuanCitationsDefinition,
  type ZhiyuanTurnCitations,
} from '../src/view/citation/turn-citations.ts'

/** 构造一份能通过 parseSearchResult 校验的 file-detail meta。 */
function fileDetailMeta(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'file-detail',
    scope: 'hits',
    kbId: 'kb-1',
    query: { terms: ['供应商'], aliases: [] },
    path: '会议/2026-04-供应商季度沟通.md',
    format: 'markdown',
    totalHits: 2,
    hits: [
      { n: 1, path: '会议/2026-04-供应商季度沟通.md', startLine: 1, endLine: 13, matchLine: 5, excerpt: '参与方：采购方' },
      { n: 2, path: '会议/2026-04-供应商季度沟通.md', startLine: 20, endLine: 24, matchLine: 22, excerpt: '质量：包装材料' },
    ],
    page: { scope: 'hits', returnedHits: 2, hasMore: false },
    scan: { complete: true, warnings: [] },
    presentation: { template: 'search-file-detail-card', version: 1 },
    ...overrides,
  }
}

function toolResult(turn: number, meta: unknown, seq = 10): Record<string, unknown> {
  return {
    type: 'tool/result',
    seq,
    surfaceOp: 'append',
    data: { turn, step: 1, message: { source: { callId: 'call-1' } }, meta },
  }
}

/** 走完一次 start + update，返回发布到 turn data 的业务值。 */
function foldTurn(definition: ZhiyuanCitationsDefinition, events: Record<string, unknown>[], turn: number): ZhiyuanTurnCitations | null {
  let state: ZhiyuanTurnCitations | undefined
  const started = definition.match({ type: 'turn/start', seq: 1, data: { turn } })
  assert.ok(started && started.role === 'start')
  state = definition.start(undefined, { ...started, event: { type: 'turn/start', seq: 1, data: { turn } } })
  for (const event of events) {
    const matched = definition.match(event)
    if (!matched) continue
    state = definition.update({ state }, { ...matched, event: event as never })
  }
  const published = definition.buildLocationData({ state }, 'turn', null)
  if (published === null) return null
  assert.equal(published.kind, 'turn')
  assert.equal(published.key, TURN_DATA_KEY)
  return published.value
}

test('引用折叠：file-detail 的 meta 变成带 kbId 的引用，overview 与坏数据不产出', () => {
  const definition = createZhiyuanCitationsDefinition()
  const citations = foldTurn(definition, [toolResult(3, fileDetailMeta())], 3)
  assert.ok(citations)
  assert.equal(citations.turn, 3)
  assert.deepEqual(citations.citations.map((item) => [item.kbId, item.hit.n]), [['kb-1', 1], ['kb-1', 2]])

  assert.deepEqual(foldTurn(definition, [toolResult(3, fileDetailMeta({ kind: 'overview', scope: 'files', files: [] }))], 3), null)
  assert.deepEqual(foldTurn(definition, [toolResult(3, { kind: 'file-detail', scope: 'hits' })], 3), null)
  assert.deepEqual(foldTurn(definition, [toolResult(3, undefined)], 3), null)
})

test('引用折叠：错误结果、异轮事件被忽略，重复命中去重，超出上限丢弃最早的', () => {
  const definition = createZhiyuanCitationsDefinition()
  const errorEvent = { ...toolResult(3, fileDetailMeta()), data: { turn: 3, step: 1, message: { isError: true, source: { callId: 'call-1' } }, meta: fileDetailMeta() } }
  assert.deepEqual(foldTurn(definition, [errorEvent], 3), null)

  const otherTurn = { ...toolResult(9, fileDetailMeta()) }
  const citations = foldTurn(definition, [otherTurn, toolResult(3, fileDetailMeta()), toolResult(3, fileDetailMeta(), 11)], 3)
  assert.ok(citations)
  assert.equal(citations.citations.length, 2)

  const many = fileDetailMeta({
    hits: Array.from({ length: 60 }, (_, index) => ({
      n: index + 1,
      path: `会议/文件-${index}.md`,
      startLine: index + 1,
      endLine: index + 1,
      matchLine: index + 1,
      excerpt: `第 ${index + 1} 行`,
    })),
    totalHits: 60,
    page: { scope: 'hits', returnedHits: 60, hasMore: false },
  })
  const capped = foldTurn(definition, [toolResult(3, many)], 3)
  assert.ok(capped)
  assert.equal(capped.citations.length, 50)
  assert.equal(capped.citations[0]?.hit.n, 11)
})

test('引用折叠：buildLocationData 在状态未变时保持 previous 身份', () => {
  const definition = createZhiyuanCitationsDefinition()
  const started = definition.match({ type: 'turn/start', seq: 1, data: { turn: 1 } })
  assert.ok(started)
  let state = definition.start(undefined, { ...started, event: { type: 'turn/start', seq: 1, data: { turn: 1 } } })
  // 没有引用时不发布；先折入一条 tool/result，再验证状态未变时 previous 身份保持。
  const matched = definition.match(toolResult(1, fileDetailMeta()))
  assert.ok(matched)
  state = definition.update({ state }, { ...matched, event: toolResult(1, fileDetailMeta()) as never })
  const first = definition.buildLocationData({ state }, 'turn', null)
  assert.ok(first)
  const second = definition.buildLocationData({ state }, 'turn', first)
  assert.equal(second, first)
})

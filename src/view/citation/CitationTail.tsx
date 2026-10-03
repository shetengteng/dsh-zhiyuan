import { useCallback } from 'react'
import type { ReactElement } from 'react'
import { ensureSettingsStyles } from '../settings/style-entry.ts'
import type { PreviewController } from '../toolview/preview/preview-state.ts'
import { isSearchHit } from '../toolview/preview/preview-selection.ts'
import { MAX_TAIL_CITATIONS, TURN_DATA_KEY, type TailCitation, type ZhiyuanTurnCitations } from './turn-citations.ts'

/** turnTail owner 提供的轮次定位；data 是按 key 读取的轮次业务值存储。 */
export type CitationTailTurn = {
  turn: number
  data?: {
    get?: (key: string) => unknown
  }
}

export type CitationTailProps = {
  turn: CitationTailTurn
  seq: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** 轮次业务值跨过 unknown 边界，这里做形状收窄；不符时按无引用处理。 */
function readCitations(turn: CitationTailTurn | undefined): ZhiyuanTurnCitations | null {
  const store = turn?.data
  const raw = typeof store?.get === 'function' ? store.get(TURN_DATA_KEY) : null
  const record = asRecord(raw)
  if (!record || typeof record.turn !== 'number' || !Array.isArray(record.citations)) return null
  const citations: TailCitation[] = []
  for (const item of record.citations) {
    const citation = asRecord(item)
    if (!citation || typeof citation.kbId !== 'string' || !isSearchHit(citation.hit)) return null
    citations.push({ kbId: citation.kbId, hit: citation.hit })
  }
  return { turn: record.turn, citations }
}

function citationKey(citation: TailCitation): string {
  return `${citation.kbId}|${citation.hit.path}|${citation.hit.startLine}|${citation.hit.endLine}|${citation.hit.matchLine}|${citation.hit.n}`
}

/** 编号撞号时给 chip 补文件名，保证一眼可分辨。 */
function chipLabel(citation: TailCitation, duplicated: boolean): string {
  if (!duplicated) return String(citation.hit.n)
  const segments = citation.hit.path.split('/')
  return `${citation.hit.n} · ${segments[segments.length - 1] || citation.hit.path}`
}

/**
 * 答案下方的知源引用条：把本轮 kb_search 命中渲染成编号 chip，点击打开命中预览。
 * 没有检索结果时返回 null，引用条整体不占位。
 */
export function createCitationTail(preview: PreviewController) {
  return function CitationTail(props: CitationTailProps): ReactElement | null {
    ensureSettingsStyles()
    const data = readCitations(props.turn)
    const onOpenCitation = useCallback((citation: TailCitation) => {
      preview.select({ kbId: citation.kbId, hit: citation.hit })
    }, [preview])
    if (data === null || data.citations.length === 0) return null
    const visible = data.citations.slice(0, MAX_TAIL_CITATIONS)
    const hidden = data.citations.length - visible.length
    const labelCount = new Map<number, number>()
    for (const citation of visible) labelCount.set(citation.hit.n, (labelCount.get(citation.hit.n) ?? 0) + 1)
    return (
      <div className="zy-cite-strip" aria-label="知源引用">
        <span className="zy-cite-label">知源引用</span>
        {visible.map((citation) => (
          <button
            key={citationKey(citation)}
            className="zy-cite-chip"
            type="button"
            title={`${citation.hit.path}:${citation.hit.matchLine}`}
            aria-label={`打开引用 ${citation.hit.n}：${citation.hit.path} 第 ${citation.hit.matchLine} 行`}
            onClick={() => onOpenCitation(citation)}
          >
            {chipLabel(citation, (labelCount.get(citation.hit.n) ?? 0) > 1)}
          </button>
        ))}
        {hidden > 0 && <span className="zy-cite-more">……另有 {hidden} 条</span>}
      </div>
    )
  }
}

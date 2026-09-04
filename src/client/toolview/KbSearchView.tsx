import type { SearchHit } from '../models.ts'
import { matchedExcerptLine } from '../search-utils.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { CitationTag } from '../CitationTag.tsx'
import type { PreviewController } from './preview/preview-state.ts'
import { isSamePreviewHit, usePreviewSelection } from './preview/preview-state.ts'

type ToolResultBlock = {
  kind?: string
  isError?: boolean
  content?: Array<{ type?: string; text?: string }>
  meta?: unknown
}

function firstTextContent(content: ToolResultBlock['content']): string {
  if (!Array.isArray(content)) return ''
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') return block.text
  }
  return ''
}

function extractSearchHits(block?: ToolResultBlock): SearchHit[] {
  const meta = asRecord(block?.meta)
  if (Array.isArray(meta?.hits)) return meta.hits.filter(isSearchHit)
  return []
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function extractBaseId(block?: ToolResultBlock): string {
  const baseId = asRecord(block?.meta)?.baseId
  return typeof baseId === 'string' ? baseId : ''
}

function extractSearchCoverage(block?: ToolResultBlock): { scanComplete: boolean; hasMore: boolean } {
  const meta = asRecord(block?.meta)
  return {
    scanComplete: meta?.scanComplete !== false,
    hasMore: meta?.hasMore === true,
  }
}

function isSearchHit(value: unknown): value is SearchHit {
  if (!value || typeof value !== 'object') return false
  const hit = value as Partial<SearchHit>
  return Number.isInteger(hit.n)
    && hit.n >= 1
    && typeof hit.path === 'string'
    && Number.isInteger(hit.startLine)
    && hit.startLine >= 1
    && Number.isInteger(hit.endLine)
    && hit.endLine >= hit.startLine
    && Number.isInteger(hit.matchLine)
    && hit.matchLine >= hit.startLine
    && hit.matchLine <= hit.endLine
    && typeof hit.excerpt === 'string'
    && (hit.matchedExcerpt === undefined || typeof hit.matchedExcerpt === 'string')
    && (hit.matchColumnByte === undefined || (Number.isInteger(hit.matchColumnByte) && hit.matchColumnByte >= 1))
    && (hit.sourceFingerprint === undefined || typeof hit.sourceFingerprint === 'string')
}

export function createKbSearchView(preview: PreviewController) {
  /** 在会话 toolview 中渲染 kb_search 命中。 */
  return function KbSearchView(props: { toolName?: string; block?: ToolResultBlock }) {
    ensureSettingsStyles()
    const block = props.block
    const running = !block || block.kind !== 'tool-result'
    const failed = block?.kind === 'tool-result' && Boolean(block.isError)
    const hits = extractSearchHits(block)
    const baseId = extractBaseId(block)
    const coverage = extractSearchCoverage(block)
    const selectedHit = usePreviewSelection(preview)

    if (running) return <div className="zy-help">正在检索知识库…</div>
    if (failed) return <div className="zy-note">{firstTextContent(block?.content) || '检索失败'}</div>
    if (!hits.length) {
      return coverage.scanComplete
        ? <div className="zy-help">无命中</div>
        : <div className="zy-note">扫描未完成，当前无命中结果不能代表整个知识库</div>
    }

    return (
      <div>
        {hits.map((hit) => {
          const selected = isSamePreviewHit(selectedHit, hit)
          return (
            <button
              key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`}
              className={selected ? 'zy-hit is-selected' : 'zy-hit'}
              type="button"
              aria-pressed={selected}
              onClick={(event) => preview.select({ baseId, hit }, event.currentTarget)}
            >
              <div className="zy-src">
                <CitationTag n={hit.n} />
                <span className="zy-path">{hit.path}:{hit.startLine}–{hit.endLine}</span>
              </div>
              <div className="zy-quote">{matchedExcerptLine(hit)}</div>
            </button>
          )
        })}
        {coverage.hasMore || !coverage.scanComplete ? (
          <div className="zy-search-coverage">
            {coverage.hasMore ? '当前结果仍有更多命中。' : ''}
            {!coverage.scanComplete ? '本次扫描未完成，不能把当前结果当成全量。' : ''}
          </div>
        ) : null}
      </div>
    )
  }
}

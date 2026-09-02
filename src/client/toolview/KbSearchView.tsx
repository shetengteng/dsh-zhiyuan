import type { SearchDocument, SearchHit } from '../models.ts'
import { matchedExcerptLine } from '../search-utils.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { CitationTag } from '../CitationTag.tsx'
import type { PreviewController } from './preview-state.ts'
import { isSamePreviewHit, usePreviewSelection } from './preview-state.ts'

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

function extractSearchDocuments(block?: ToolResultBlock): Map<string, string> {
  const meta = asRecord(block?.meta)
  if (!Array.isArray(meta?.documents)) return new Map()
  const documents = new Map<string, string>()
  for (const value of meta.documents) {
    if (!isSearchDocument(value) || documents.has(value.path)) continue
    documents.set(value.path, value.text)
  }
  return documents
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isSearchDocument(value: unknown): value is SearchDocument {
  const document = asRecord(value)
  return typeof document?.path === 'string'
    && document.path.trim().length > 0
    && typeof document.text === 'string'
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
}

export function createKbSearchView(preview: PreviewController) {
  /** Renders kb_search results in the conversation tool view. */
  return function KbSearchView(props: { toolName?: string; block?: ToolResultBlock }) {
    ensureSettingsStyles()
    const block = props.block
    const running = !block || block.kind !== 'tool-result'
    const failed = block?.kind === 'tool-result' && Boolean(block.isError)
    const hits = extractSearchHits(block)
    const documents = extractSearchDocuments(block)
    const selectedHit = usePreviewSelection(preview)

    if (running) return <div className="zy-help">正在检索知识库…</div>
    if (failed) return <div className="zy-note">{firstTextContent(block?.content) || '检索失败'}</div>
    if (!hits.length) return <div className="zy-help">无命中</div>

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
              onClick={(event) => preview.select(hit, event.currentTarget, documents.get(hit.path))}
            >
              <div className="zy-src">
                <CitationTag n={hit.n} />
                <span className="zy-path">{hit.path}:{hit.startLine}–{hit.endLine}</span>
              </div>
              <div className="zy-quote">{matchedExcerptLine(hit)}</div>
            </button>
          )
        })}
      </div>
    )
  }
}

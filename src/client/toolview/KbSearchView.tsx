import { useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SearchHit } from '../models.ts'
import { matchedExcerptLine } from '../search-utils.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { MdEditor } from '../settings/MdEditor.tsx'

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
  const meta = block?.meta as { hits?: SearchHit[] } | undefined
  if (Array.isArray(meta?.hits)) return meta.hits.filter(isSearchHit)
  return []
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

/** Renders kb_search results in the conversation tool view. */
export function KbSearchView(props: { toolName?: string; block?: ToolResultBlock }) {
  ensureSettingsStyles()
  const block = props.block
  const running = !block || block.kind !== 'tool-result'
  const failed = block?.kind === 'tool-result' && Boolean(block.isError)
  const hits = extractSearchHits(block)
  const [selectedHit, setSelectedHit] = useState(null as SearchHit | null)

  if (running) return <div className="zy-help">正在检索知识库…</div>
  if (failed) return <div className="zy-note">{firstTextContent(block?.content) || '检索失败'}</div>
  if (!hits.length) return <div className="zy-help">无命中</div>

  return (
    <div>
      {hits.map((hit) => (
        <button key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`} className="zy-hit" type="button" onClick={() => setSelectedHit(hit)}>
          <div className="zy-src">
            <span className="zy-ntag">[{hit.n}]</span>
            <span className="zy-path">{hit.path}:{hit.startLine}–{hit.endLine}</span>
          </div>
          <div className="zy-quote">{matchedExcerptLine(hit)}</div>
        </button>
      ))}
      {selectedHit ? (
        <Modal
          open
          onClose={() => setSelectedHit(null)}
          title="只读预览"
          description={`${selectedHit.path} · [${selectedHit.n}]`}
          className="zy-modal-wide"
          footer={<button className="zy-btn" type="button" onClick={() => setSelectedHit(null)}>关闭</button>}
        >
          <MdEditor
            key={`${selectedHit.path}-${selectedHit.startLine}-${selectedHit.endLine}-${selectedHit.matchLine}`}
            text={selectedHit.excerpt}
            focusLine={selectedHit.matchLine - selectedHit.startLine + 1}
            readonly
          />
        </Modal>
      ) : null}
    </div>
  )
}

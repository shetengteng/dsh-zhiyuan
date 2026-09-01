import { useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SearchHit } from '../models.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'

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
  if (Array.isArray(meta?.hits)) return meta.hits
  return []
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
        <button key={`${hit.n}-${hit.path}-${hit.startLine}`} className="zy-hit" type="button" onClick={() => setSelectedHit(hit)}>
          <div className="zy-src">
            <span className="zy-ntag">[{hit.n}]</span>
            <span className="zy-path">{hit.path}:{hit.startLine}–{hit.endLine}</span>
          </div>
          <div className="zy-quote">{hit.excerpt.split('\n').find((line) => line.trim()) ?? hit.excerpt}</div>
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
          <pre className="zy-pre">{selectedHit.excerpt}</pre>
        </Modal>
      ) : null}
    </div>
  )
}

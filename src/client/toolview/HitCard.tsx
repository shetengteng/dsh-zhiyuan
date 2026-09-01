import { useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { ensureSettingsStyles } from '../settings/styles.ts'

type ToolBlock = {
  kind?: string
  isError?: boolean
  content?: Array<{ type?: string; text?: string }>
  meta?: unknown
}

type SearchHit = {
  n: number
  path: string
  startLine: number
  endLine: number
  excerpt: string
}

function firstText(content: ToolBlock['content']): string {
  if (!Array.isArray(content)) return ''
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') return block.text
  }
  return ''
}

function hitsFrom(block?: ToolBlock): SearchHit[] {
  const meta = block?.meta as { hits?: SearchHit[] } | undefined
  if (Array.isArray(meta?.hits)) return meta.hits
  return []
}

export function KbSearchView(props: { toolName?: string; block?: ToolBlock }) {
  ensureSettingsStyles()
  const block = props.block
  const running = !block || block.kind !== 'tool-result'
  const failed = block?.kind === 'tool-result' && Boolean(block.isError)
  const hits = hitsFrom(block)
  const [open, setOpen] = useState(null as SearchHit | null)

  if (running) return <div className="zy-help">正在检索知识库…</div>
  if (failed) return <div className="zy-note">{firstText(block?.content) || '检索失败'}</div>
  if (!hits.length) return <div className="zy-help">无命中</div>

  return (
    <div>
      {hits.map((hit) => (
        <button key={`${hit.n}-${hit.path}-${hit.startLine}`} className="zy-hit" type="button" onClick={() => setOpen(hit)}>
          <div className="zy-src">
            <span className="zy-ntag">[{hit.n}]</span>
            <span className="zy-path">{hit.path}:{hit.startLine}–{hit.endLine}</span>
          </div>
          <div className="zy-quote">{hit.excerpt.split('\n').find((line) => line.trim()) ?? hit.excerpt}</div>
        </button>
      ))}
      {open ? (
        <Modal
          open
          onClose={() => setOpen(null)}
          title="只读预览"
          description={`${open.path} · [${open.n}]`}
          className="zy-modal-wide"
          footer={<button className="zy-btn" type="button" onClick={() => setOpen(null)}>关闭</button>}
        >
          <pre className="zy-pre">{open.excerpt}</pre>
        </Modal>
      ) : null}
    </div>
  )
}

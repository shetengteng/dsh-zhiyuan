import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { VERSION_LABEL } from '../../model/constants.ts'
import type { KbSummaryResponse, JobStatusResponse, KbTreeNodeResponse } from '../types.ts'
import { SearchIcon, TrashIcon, TwistIcon } from './Icons.tsx'

export function KbPage(props: {
  kbs: KbSummaryResponse[]
  currentKb?: KbSummaryResponse
  tree: KbTreeNodeResponse[]
  job?: JobStatusResponse
  pending: boolean
  onSelectKb: (kbId: string) => void
  onCreate: () => void
  onEdit: () => void
  onImport: () => void
  onSearch: () => void
  onDeleteKb: (kb: KbSummaryResponse) => void
  onOpenEntry: (entryPath: string) => void
  onDeleteEntry: (entryPath: string, kind: 'file' | 'dir') => void
}) {
  if (!props.kbs.length) {
    return (
      <div className="zy-kb-layout is-empty">
        <div className="zy-kb-panel">
          <div className="zy-empty">
            <h2>先新建知识库</h2>
            <p>写上标题和描述，说明这个库装什么。然后才能导入文件、在对话里提问。导入不会自动建库。</p>
            <button className="zy-btn zy-primary" type="button" onClick={props.onCreate}>新建知识库</button>
          </div>
        </div>
      </div>
    )
  }
  const kb = props.currentKb
  return (
    <div className="zy-kb-layout">
      <div className="zy-kb-list">
        {props.kbs.map((kb) => (
          <div key={kb.id} className={`zy-kb-row${props.currentKb?.id === kb.id ? ' is-on' : ''}`}>
            <button className="zy-kb-select" type="button" onClick={() => props.onSelectKb(kb.id)}>
              <span className="zy-kb-name">{kb.title || kb.id}</span>
              <span className="zy-kb-version">{VERSION_LABEL}</span>
            </button>
            <button className="zy-del" type="button" aria-label={`删除 ${kb.title}`} onClick={() => props.onDeleteKb(kb)}>
              <TrashIcon />
            </button>
          </div>
        ))}
        <button className="zy-ghost" type="button" onClick={props.onCreate}>+ 新建知识库</button>
      </div>
      <div className="zy-kb-panel">
        {kb ? (
          <>
            <div className="zy-kb-head">
              <p className="zy-sub">{formatKbMeta(kb)}</p>
              <div className="zy-actions">
                <button className="zy-btn" type="button" onClick={props.onEdit}>编辑</button>
                <button className="zy-btn zy-primary" type="button" onClick={props.onImport}>导入</button>
              </div>
            </div>
            <KbDescription description={kb.description} aliases={kb.aliases} kbPath={`kbs/${kb.id}/`} />
            <div className="zy-tree">
              {props.pending ? <p className="zy-help">加载中…</p> : null}
              {props.tree.map((node) => <KbTreeItem key={node.path} node={node} onOpenEntry={props.onOpenEntry} onDeleteEntry={props.onDeleteEntry} />)}
            </div>
            <div className="zy-foot">
              {jobDot(props.job)}
              <span>{jobText(props.job)}</span>
              <button className="zy-icon" type="button" onClick={props.onSearch} aria-label="搜索" title="搜索">
                <SearchIcon />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function formatKbMeta(kb: KbSummaryResponse): string {
  const parts = [`${kb.approxDocs} 篇`, `${kb.categories.length} 个类目`]
  if (kb.lastUsed) parts.push('上次用')
  return parts.join(' · ')
}

function KbDescription(props: { description: string; aliases: string[]; kbPath: string }) {
  const text = props.description.trim() || '没有描述'
  const alias = props.aliases.length ? `别名：${props.aliases.join(', ')}` : ''
  return (
    <details className="zy-kb-description">
      <summary>
        <span className="zy-kb-summary">{text}</span>
        <span className="zy-kb-ellipsis" aria-hidden="true"> ...</span>
      </summary>
      <div className="zy-kb-description-body">
        <div className="zy-help"><code>{props.kbPath}</code></div>
        {alias ? <div className="zy-help">{alias}</div> : null}
      </div>
    </details>
  )
}

function jobDot(job?: JobStatusResponse) {
  if (!job) return null
  if (job.running) return <StateDot state="ongoing" size={8} />
  if (job.failed.length) return <StateDot state="error" size={8} />
  return null
}

function jobText(job?: JobStatusResponse): string {
  if (!job) return '任务 无'
  if (job.running) return `任务进行中：${job.op ?? ''}`
  const fail = job.failed.length
  return fail ? `失败 ${fail}，断连后仍保留` : '任务 无'
}

function KbTreeItem(props: {
  node: KbTreeNodeResponse
  onOpenEntry: (entryPath: string) => void
  onDeleteEntry: (entryPath: string, kind: 'file' | 'dir') => void
}) {
  const deleteButton = (
    <button className="zy-del" type="button" aria-label={`删除 ${props.node.name}`} onClick={() => props.onDeleteEntry(props.node.path, props.node.kind)}>
      <TrashIcon />
    </button>
  )
  if (props.node.kind === 'dir') {
    return (
      <details open>
        <summary>
          <TwistIcon />
          <span>{props.node.name}</span>
          {deleteButton}
        </summary>
        {(props.node.children ?? []).map((child) => (
          <KbTreeItem key={child.path} node={child} onOpenEntry={props.onOpenEntry} onDeleteEntry={props.onDeleteEntry} />
        ))}
      </details>
    )
  }
  return (
    <div className="zy-file">
      <button type="button" className="zy-file-open" onClick={() => props.onOpenEntry(props.node.path)}>{props.node.name}</button>
      <span className="meta">{formatSize(props.node.size)}</span>
      <span className="when">{formatWhen(props.node.mtime)}</span>
      {deleteButton}
    </div>
  )
}

function formatSize(size?: number): string {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  return `${Math.round(size / 1024)} KB`
}

function formatWhen(mtime?: number): string {
  if (!mtime) return ''
  const days = Math.floor((Date.now() - mtime) / 86_400_000)
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 7) return '上周'
  return `${new Date(mtime).getMonth() + 1} 月`
}

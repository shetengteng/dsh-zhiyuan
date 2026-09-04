import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary, JobStatus, TreeNode } from '../models.ts'
import { SearchIcon, TrashIcon, TwistIcon } from './Icons.tsx'

export function BasePage(props: {
  bases: BaseSummary[]
  currentBase?: BaseSummary
  tree: TreeNode[]
  job?: JobStatus
  pending: boolean
  onSelectBase: (baseId: string) => void
  onCreate: () => void
  onEdit: () => void
  onImport: () => void
  onSearch: () => void
  onDeleteBase: (base: BaseSummary) => void
  onOpenEntry: (entryPath: string) => void
  onDeleteEntry: (entryPath: string, kind: 'file' | 'dir') => void
}) {
  if (!props.bases.length) {
    return (
      <div className="zy-base-layout is-empty">
        <div className="zy-base-panel">
          <div className="zy-empty">
            <h2>先新建知识库</h2>
            <p>写上标题和描述，说明这个库装什么。然后才能导入文件、在对话里提问。导入不会自动建库。</p>
            <button className="zy-btn zy-primary" type="button" onClick={props.onCreate}>新建知识库</button>
          </div>
        </div>
      </div>
    )
  }
  const base = props.currentBase
  return (
    <div className="zy-base-layout">
      <div className="zy-base-list">
        {props.bases.map((base) => (
          <div key={base.id} className={`zy-base-row${props.currentBase?.id === base.id ? ' is-on' : ''}`}>
            <button className="zy-base-select" type="button" onClick={() => props.onSelectBase(base.id)}>
              {base.title || base.id}
            </button>
            <button className="zy-del" type="button" aria-label={`删除 ${base.title}`} onClick={() => props.onDeleteBase(base)}>
              <TrashIcon />
            </button>
          </div>
        ))}
        <button className="zy-ghost" type="button" onClick={props.onCreate}>+ 新建知识库</button>
      </div>
      <div className="zy-base-panel">
        {base ? (
          <>
            <div className="zy-base-head">
              <p className="zy-sub">{formatBaseMeta(base)}</p>
              <div className="zy-actions">
                <button className="zy-btn" type="button" onClick={props.onEdit}>编辑</button>
                <button className="zy-btn zy-primary" type="button" onClick={props.onImport}>导入</button>
              </div>
            </div>
            <BaseDescription description={base.description} aliases={base.aliases} basePath={`bases/${base.id}/`} />
            <div className="zy-tree">
              {props.pending ? <p className="zy-help">加载中…</p> : null}
              {props.tree.map((node) => <BaseTreeItem key={node.path} node={node} onOpenEntry={props.onOpenEntry} onDeleteEntry={props.onDeleteEntry} />)}
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

function formatBaseMeta(base: BaseSummary): string {
  const parts = [`${base.approxDocs} 篇`, `${base.categories.length} 个类目`]
  if (base.lastUsed) parts.push('上次用')
  return parts.join(' · ')
}

function BaseDescription(props: { description: string; aliases: string[]; basePath: string }) {
  const text = props.description.trim() || '没有描述'
  const alias = props.aliases.length ? `别名：${props.aliases.join(', ')}` : ''
  return (
    <details className="zy-base-description">
      <summary>
        <span className="zy-base-summary">{text}</span>
        <span className="zy-base-ellipsis" aria-hidden="true"> ...</span>
      </summary>
      <div className="zy-base-description-body">
        <div className="zy-help"><code>{props.basePath}</code></div>
        {alias ? <div className="zy-help">{alias}</div> : null}
      </div>
    </details>
  )
}

function jobDot(job?: JobStatus) {
  if (!job) return null
  if (job.running) return <StateDot state="ongoing" size={8} />
  if (job.failed.length) return <StateDot state="error" size={8} />
  return null
}

function jobText(job?: JobStatus): string {
  if (!job) return '任务 无'
  if (job.running) return `任务进行中：${job.op ?? ''}`
  const fail = job.failed.length
  return fail ? `失败 ${fail}，断连后仍保留` : '任务 无'
}

function BaseTreeItem(props: {
  node: TreeNode
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
          <BaseTreeItem key={child.path} node={child} onOpenEntry={props.onOpenEntry} onDeleteEntry={props.onDeleteEntry} />
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

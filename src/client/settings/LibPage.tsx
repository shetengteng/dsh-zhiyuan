import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary, JobStatus, TreeNode } from '../models.ts'
import { SearchIcon, TrashIcon, TwistIcon } from './icons.tsx'

export function LibPage(props: {
  bases: BaseSummary[]
  current?: BaseSummary
  tree: TreeNode[]
  job?: JobStatus
  pending: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onEdit: () => void
  onImport: () => void
  onSearch: () => void
  onDeleteBase: (base: BaseSummary) => void
  onOpenFile: (path: string) => void
  onDeleteEntry: (path: string, kind: 'file' | 'dir') => void
}) {
  if (!props.bases.length) {
    return (
      <div className="zy-lib is-empty">
        <div className="zy-cab">
          <div className="zy-empty">
            <h2>先新建知识库</h2>
            <p>写上标题和描述，说明这个库装什么。然后才能导入文件、在对话里提问。导入不会自动建库。</p>
            <button className="zy-btn zy-primary" type="button" onClick={props.onCreate}>新建知识库</button>
          </div>
        </div>
      </div>
    )
  }
  const current = props.current
  const lead = current?.description.split('。')[0] || '没有描述'
  return (
    <div className="zy-lib">
      <div className="zy-list">
        {props.bases.map((base) => (
          <div key={base.id} className={`zy-row${current?.id === base.id ? ' is-on' : ''}`}>
            <button className="zy-base" type="button" onClick={() => props.onSelect(base.id)}>
              {base.title || base.id}
            </button>
            <button className="zy-del" type="button" aria-label={`删除 ${base.title}`} onClick={() => props.onDeleteBase(base)}>
              <TrashIcon />
            </button>
          </div>
        ))}
        <button className="zy-ghost" type="button" onClick={props.onCreate}>+ 新建知识库</button>
      </div>
      <div className="zy-cab">
        {current ? (
          <>
            <div className="zy-cab-head">
              <div>
                <h2>{current.title}</h2>
                <p className="zy-sub"><code>bases/{current.id}/</code> · {current.approxDocs} 篇</p>
              </div>
              <div className="zy-actions">
                <button className="zy-btn" type="button" onClick={props.onEdit}>编辑</button>
                <button className="zy-btn zy-primary" type="button" onClick={props.onImport}>导入</button>
              </div>
            </div>
            <details className="zy-door">
              <summary>
                <TwistIcon />
                {lead}
              </summary>
              <div className="zy-door-body">
                {current.description}
                {current.aliases.length ? <div className="zy-help">别名：{current.aliases.join(', ')}</div> : null}
              </div>
            </details>
            <div className="zy-tree">
              {props.pending ? <p className="zy-help">加载中…</p> : null}
              {props.tree.map((node) => <TreeItem key={node.path} node={node} onOpen={props.onOpenFile} onDelete={props.onDeleteEntry} />)}
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

function TreeItem(props: {
  node: TreeNode
  onOpen: (path: string) => void
  onDelete: (path: string, kind: 'file' | 'dir') => void
}) {
  const del = (
    <button className="zy-del" type="button" aria-label={`删除 ${props.node.name}`} onClick={() => props.onDelete(props.node.path, props.node.kind)}>
      <TrashIcon />
    </button>
  )
  if (props.node.kind === 'dir') {
    return (
      <details open>
        <summary>
          <TwistIcon />
          <span>{props.node.name}</span>
          {del}
        </summary>
        {(props.node.children ?? []).map((child) => (
          <TreeItem key={child.path} node={child} onOpen={props.onOpen} onDelete={props.onDelete} />
        ))}
      </details>
    )
  }
  return (
    <div className="zy-file">
      <button type="button" className="zy-file-open" onClick={() => props.onOpen(props.node.path)}>{props.node.name}</button>
      <span className="meta">{formatSize(props.node.size)}</span>
      <span className="when">{formatWhen(props.node.mtime)}</span>
      {del}
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

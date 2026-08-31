import { useState } from 'react'
import {
  Button,
  DisclosureRow,
  IconFolderOpen16,
  IconQuestionOutline14,
  IconSearchOutline16,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary, JobStatus, TreeNode } from '../models.ts'

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
  const [descOpen, setDescOpen] = useState(false)
  if (!props.bases.length) {
    return (
      <div className="zy-lib is-empty">
        <div className="zy-cab">
          <div className="zy-empty">
            <h2>先新建知识库</h2>
            <p>写上标题和描述，说明这个库装什么。然后才能导入文件、在对话里提问。导入不会自动建库。</p>
            <Button variant="primary" type="button" onClick={props.onCreate}>新建知识库</Button>
          </div>
        </div>
      </div>
    )
  }
  const current = props.current
  return (
    <div className="zy-lib">
      <div className="zy-list">
        {props.bases.map((base) => (
          <div key={base.id} className={`zy-row${current?.id === base.id ? ' is-on' : ''}`}>
            <button className="zy-base" type="button" onClick={() => props.onSelect(base.id)}>
              <span>{base.title || base.id}</span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="zy-row-del"
              type="button"
              aria-label={`删除 ${base.title}`}
              onClick={() => props.onDeleteBase(base)}
            >
              ×
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="zy-list-add" type="button" onClick={props.onCreate}>
          + 新建知识库
        </Button>
      </div>
      <div className="zy-cab">
        {current ? (
          <>
            <div className="zy-cab-head">
              <div>
                <h2>{current.title}</h2>
                <p className="zy-sub"><code>bases/{current.id}/</code> · {current.approxDocs} 篇{current.lastUsed ? ' · 上次用' : ''}</p>
              </div>
              <div className="zy-actions">
                <Button variant="outline" size="sm" type="button" onClick={props.onEdit}>编辑</Button>
                <Button variant="primary" size="sm" type="button" icon={<IconFolderOpen16 />} onClick={props.onImport}>导入</Button>
              </div>
            </div>
            <DisclosureRow
              className="zy-door"
              icon={<IconQuestionOutline14 />}
              title={current.description.split('。')[0] || '没有描述'}
              open={descOpen}
              expandable={Boolean(current.description || current.aliases.length)}
              onToggle={() => setDescOpen((value) => !value)}
            >
              {current.description ? <div>{current.description}</div> : null}
              {current.aliases.length ? <p className="zy-help">别名：{current.aliases.join(', ')}</p> : null}
            </DisclosureRow>
            <div className="zy-tree">
              {props.pending ? <p className="zy-help">加载中…</p> : null}
              {props.tree.map((node) => <TreeItem key={node.path} node={node} onOpen={props.onOpenFile} onDelete={props.onDeleteEntry} />)}
            </div>
            <div className="zy-foot">
              {jobDot(props.job)}
              <span>{jobText(props.job)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="zy-foot-search"
                type="button"
                icon={<IconSearchOutline16 />}
                onClick={props.onSearch}
                aria-label="搜索"
              />
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
    <Button
      variant="ghost"
      size="sm"
      className="zy-tree-del"
      type="button"
      aria-label={`删除 ${props.node.name}`}
      onClick={() => props.onDelete(props.node.path, props.node.kind)}
    >
      ×
    </Button>
  )
  if (props.node.kind === 'dir') {
    return (
      <details open>
        <summary>
          {props.node.name}
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
      <button type="button" className="zy-file-open" onClick={() => props.onOpen(props.node.path)}>
        {props.node.name}
      </button>
      <span className="meta">{formatSize(props.node.size)}</span>
      {del}
    </div>
  )
}

function formatSize(size?: number): string {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  return `${Math.round(size / 1024)} KB`
}

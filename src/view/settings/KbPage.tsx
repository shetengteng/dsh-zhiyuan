import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRef, useState, type ReactNode } from 'react'
import type { KbSummaryResponse, JobStatusResponse, KbTreeNodeResponse } from '../view-models.ts'
import { EditIcon, FileIcon, FolderIcon, ImportIcon, SearchIcon, TrashIcon } from './Icons.tsx'
import { KbResizer } from './KbResizer.tsx'

// 三栏布局常量，与 workbench-styles 里 `.zy-kb-layout` 的默认列模板保持一致。
// RESIZER_WIDTH 取 8px 并配合负边距骑线，对齐 DSH 壳侧栏手柄的热区手感；
// 相邻面板再以 -8px 负边距覆盖 resizer 轨道彼此贴合，保证接缝只有一条分隔线且上下封边连续。
const KB_LIST_DEFAULT_WIDTH = 168
const MIN_KB_LIST_WIDTH = 140
const RESIZER_WIDTH = 8
const MIN_TREE_WIDTH = 220
const MIN_PREVIEW_WIDTH = 320
const DEFAULT_PREVIEW_WIDTH = 600

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
  /** 右侧预览栏正在展示的树内文件路径，用于给目录树里的选中行加背景。 */
  selectedEntryPath?: string
  previewPanel?: ReactNode
}) {
  const [kbListWidth, setKbListWidth] = useState(KB_LIST_DEFAULT_WIDTH)
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH)
  const layoutRef = useRef<HTMLDivElement>(null)
  const clampKbListWidth = (width: number): number => {
    const container = layoutRef.current?.clientWidth ?? 1152
    return Math.max(MIN_KB_LIST_WIDTH, Math.min(container - previewWidth - 2 * RESIZER_WIDTH - MIN_TREE_WIDTH, width))
  }
  const clampPreviewWidth = (width: number): number => {
    const container = layoutRef.current?.clientWidth ?? 1152
    return Math.max(MIN_PREVIEW_WIDTH, Math.min(container - kbListWidth - 2 * RESIZER_WIDTH - MIN_TREE_WIDTH, width))
  }
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
    <div
      ref={layoutRef}
      className="zy-kb-layout"
      style={{ gridTemplateColumns: `${kbListWidth}px ${RESIZER_WIDTH}px minmax(${MIN_TREE_WIDTH}px,1fr) ${RESIZER_WIDTH}px ${previewWidth}px` }}
    >
      <div className="zy-kb-list">
        {props.kbs.map((kb) => (
          <div key={kb.id} className={`zy-kb-row${props.currentKb?.id === kb.id ? ' is-on' : ''}`}>
            <button className="zy-kb-select" type="button" onClick={() => props.onSelectKb(kb.id)}>
              <span className="zy-kb-name">{kb.title || kb.id}</span>
            </button>
            <button className="zy-del" type="button" aria-label={`删除 ${kb.title}`} onClick={() => props.onDeleteKb(kb)}>
              <TrashIcon />
            </button>
          </div>
        ))}
        <button className="zy-ghost" type="button" onClick={props.onCreate}>+ 新建知识库</button>
      </div>
      <KbResizer side="left" width={kbListWidth} label="调整知识库列表宽度" onChange={(width) => setKbListWidth(clampKbListWidth(width))} />
      <div className="zy-kb-panel">
        {kb ? (
          <>
            <div className="zy-kb-head">
              <p className="zy-sub">{formatKbMeta(kb)}</p>
              <div className="zy-actions">
                <button className="zy-icon" type="button" onClick={props.onSearch} aria-label="搜索" title="搜索">
                  <SearchIcon />
                </button>
                <button className="zy-icon" type="button" onClick={props.onEdit} aria-label="编辑" title="编辑">
                  <EditIcon />
                </button>
                <button className="zy-icon" type="button" onClick={props.onImport} aria-label="导入" title="导入">
                  <ImportIcon />
                </button>
              </div>
            </div>
            <KbDescription description={kb.description} aliases={kb.aliases} kbPath={`kbs/${kb.id}/`} />
            <div className="zy-tree">
              {props.pending ? <p className="zy-help">加载中…</p> : null}
              {props.tree.map((node) => (
                <KbTreeItem
                  key={node.path}
                  node={node}
                  selectedEntryPath={props.selectedEntryPath}
                  onOpenEntry={props.onOpenEntry}
                  onDeleteEntry={props.onDeleteEntry}
                />
              ))}
            </div>
            {props.job?.running || props.job?.failed.length ? (
              <div className="zy-foot">
                {jobDot(props.job)}
                <span>{jobText(props.job)}</span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <KbResizer side="right" width={previewWidth} label="调整预览栏宽度" onChange={(width) => setPreviewWidth(clampPreviewWidth(width))} />
      <div className="zy-preview-rail">
        {props.previewPanel ?? (
          <div className="zy-preview-empty">
            <div className="zy-preview-empty-title">未选择文件</div>
            <p>在中间目录树里点一个文件，在这里预览和编辑。</p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatKbMeta(kb: KbSummaryResponse): string {
  const parts = [`${kb.approxDocs} 篇`, `${kb.categories.length} 个类目`]
  if (kb.lastUsed) {
    const when = formatRelativeTime(kb.lastUsedAt)
    parts.push(when ? `上次用 ${when}` : '上次用')
  }
  return parts.join(' · ')
}

/** 「上次用」的相对时间文案；时间为 0（目录扫描出的占位卡片）时返回空串。 */
function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return ''
  const elapsed = Date.now() - timestamp
  if (elapsed < 60_000) return '刚刚'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前`
  if (elapsed < 7 * 86_400_000) return `${Math.floor(elapsed / 86_400_000)} 天前`
  const date = new Date(timestamp)
  const monthDay = `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  return date.getFullYear() === new Date().getFullYear() ? monthDay : `${date.getFullYear()} 年 ${monthDay}`
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

/** 底部任务行只在有活动或失败时渲染，空闲时不占位。 */
function jobDot(job?: JobStatusResponse) {
  if (!job) return null
  if (job.running) return <StateDot state="ongoing" size={8} />
  return <StateDot state="error" size={8} />
}

function jobText(job?: JobStatusResponse): string {
  if (!job) return ''
  if (job.running) return `任务进行中：${job.op ?? ''}`
  return `失败 ${job.failed.length}，断连后仍保留`
}

function KbTreeItem(props: {
  node: KbTreeNodeResponse
  selectedEntryPath?: string
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
          <FolderIcon />
          <span>{props.node.name}</span>
          {deleteButton}
        </summary>
        {(props.node.children ?? []).map((child) => (
          <KbTreeItem key={child.path} node={child} selectedEntryPath={props.selectedEntryPath} onOpenEntry={props.onOpenEntry} onDeleteEntry={props.onDeleteEntry} />
        ))}
      </details>
    )
  }
  return (
    <div className={`zy-file${props.node.path === props.selectedEntryPath ? ' is-on' : ''}`}>
      <button type="button" className="zy-file-open" onClick={() => props.onOpenEntry(props.node.path)}>
        <FileIcon path={props.node.path} />
        <span className="zy-file-name">{props.node.name}</span>
      </button>
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

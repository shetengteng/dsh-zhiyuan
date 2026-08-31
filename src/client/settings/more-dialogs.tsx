import { useEffect, useRef, useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SearchHit } from '../models.ts'
import { Field, Note } from './dialogs.tsx'
import { SearchIcon } from './icons.tsx'

function readForm(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

export function ImportDialog(props: {
  baseId: string
  error: string
  busy: boolean
  onClose: () => void
  onPick: (kind: 'file' | 'dir') => Promise<string>
  onSubmit: (input: { sourcePath: string; destCategory: string; preserveTree: boolean; createMissing: boolean }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  const pathRef = useRef<HTMLInputElement>(null)
  const [createMissing, setCreateMissing] = useState(true)
  const [preserveTree, setPreserveTree] = useState(false)
  const [picking, setPicking] = useState(false)

  const pick = async (kind: 'file' | 'dir') => {
    if (picking || props.busy) return
    setPicking(true)
    try {
      const path = await props.onPick(kind)
      if (path && pathRef.current) pathRef.current.value = path
    } finally {
      setPicking(false)
    }
  }

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`导入到 ${props.baseId}`}
      className="zy-modal-form"
      footer={(
        <div className="zy-footbar">
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          <button className="zy-btn zy-primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>开始导入</button>
        </div>
      )}
    >
      <form
        ref={form}
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          const data = readForm(event)
          props.onSubmit({
            sourcePath: String(data.get('sourcePath') ?? '').trim(),
            destCategory: String(data.get('destCategory') ?? '').trim(),
            preserveTree,
            createMissing,
          })
        }}
      >
        <Field
          label="源"
          help="点按钮打开系统对话框选本机目录或文件。也可以粘贴完整路径。目前 md/txt。"
        >
          <div className="zy-source">
            <button className="zy-btn" type="button" disabled={picking || props.busy} onClick={() => void pick('dir')}>
              选择文件夹
            </button>
            <button className="zy-btn" type="button" disabled={picking || props.busy} onClick={() => void pick('file')}>
              选择文件
            </button>
          </div>
          <input ref={pathRef} className="zy-box" name="sourcePath" placeholder="~/notes/合同" required />
        </Field>
        <Field label="类目" help="空 = 库根。可输入新路径，不会因此新建知识库。">
          <input className="zy-box" name="destCategory" placeholder="合同/2024" />
        </Field>
        <div className="zy-checks">
          <label>
            <input type="checkbox" checked={createMissing} onChange={() => setCreateMissing((value) => !value)} />
            目录不存在则创建
          </label>
          <label>
            <input type="checkbox" checked={preserveTree} onChange={() => setPreserveTree((value) => !value)} />
            保留源目录结构
          </label>
        </div>
        <Note text={props.error} />
      </form>
    </Modal>
  )
}

export function SearchDialog(props: {
  baseId: string
  query: string
  hits: SearchHit[]
  warning: string
  busy: boolean
  searched: boolean
  onClose: () => void
  onSearch: (query: string) => void
  onOpen: (hit: SearchHit) => void
}) {
  return (
    <Modal open onClose={props.onClose} title={`搜索  ${props.baseId}`} className="zy-modal-form">
      <form
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          props.onSearch(String(readForm(event).get('query') ?? ''))
        }}
      >
        <div className="zy-search-bar">
          <input className="zy-box" name="query" placeholder="关键词" defaultValue={props.query} autoFocus />
          <button className="zy-icon" type="submit" aria-label="搜索" disabled={props.busy}>
            <SearchIcon />
          </button>
        </div>
      </form>
      <Note text={props.warning} />
      {props.busy ? <p className="zy-help">检索中…</p> : null}
      {props.hits.length ? (
        <div className="zy-search-hits">
          {props.hits.map((hit) => (
            <button key={`${hit.n}-${hit.path}-${hit.startLine}`} className="zy-hit-line" type="button" onClick={() => props.onOpen(hit)}>
              {hit.path}:{hit.startLine}{' '}
              <HitMark text={hit.excerpt.split('\n').find((line) => line.trim()) ?? ''} query={props.query} />
            </button>
          ))}
        </div>
      ) : null}
      {props.searched && !props.busy && !props.hits.length && !props.warning ? <p className="zy-help">无命中</p> : null}
    </Modal>
  )
}

function HitMark(props: { text: string; query: string }) {
  const q = props.query.trim()
  const i = q ? props.text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return <>{props.text}</>
  return (
    <>
      {props.text.slice(0, i)}
      <mark>{props.text.slice(i, i + q.length)}</mark>
      {props.text.slice(i + q.length)}
    </>
  )
}

export function PreviewDialog(props: {
  path: string
  text: string
  startLine?: number
  endLine?: number
  readonly: boolean
  error: string
  busy: boolean
  onClose: () => void
  onSave?: (text: string) => void
  onDelete?: () => void
}) {
  const form = useRef<HTMLFormElement>(null)
  const fileName = props.path.split('/').pop() || props.path
  return (
    <Modal
      open
      onClose={props.onClose}
      title={fileName}
      description={props.path}
      className="zy-modal-wide"
      footer={props.readonly ? undefined : (
        <div className="zy-footbar">
          <button className="zy-btn zy-danger" type="button" onClick={props.onDelete}>删除</button>
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          <button className="zy-btn zy-primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>保存</button>
        </div>
      )}
    >
      {props.readonly ? (
        <HighlightedPre text={props.text} startLine={props.startLine} endLine={props.endLine} />
      ) : (
        <form
          ref={form}
          onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
            if (!props.onSave) return
            props.onSave(String(readForm(event).get('text') ?? ''))
          }}
        >
          <textarea className="zy-area" name="text" defaultValue={props.text} style={{ minHeight: 280 }} />
        </form>
      )}
      <Note text={props.error} />
    </Modal>
  )
}

function HighlightedPre(props: { text: string; startLine?: number; endLine?: number }) {
  const markRef = useRef<HTMLElement>(null)
  const start = props.startLine && props.startLine > 0 ? props.startLine : 0
  const end = props.endLine && props.endLine >= start ? props.endLine : start
  useEffect(() => {
    markRef.current?.scrollIntoView({ block: 'center' })
  }, [start, end, props.text])
  if (!start) return <pre className="zy-pre">{props.text}</pre>
  const lines = props.text.split(/\r?\n/)
  const first = Math.min(start, lines.length)
  const last = Math.min(end || first, lines.length)
  const before = lines.slice(0, first - 1).join('\n')
  const mid = lines.slice(first - 1, last).join('\n')
  const after = lines.slice(last).join('\n')
  return (
    <pre className="zy-pre">
      {before}{before && mid ? '\n' : ''}
      <mark ref={markRef} className="zy-hl">{mid}</mark>
      {after ? `\n${after}` : ''}
    </pre>
  )
}

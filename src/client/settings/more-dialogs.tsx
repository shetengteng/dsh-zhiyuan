import { useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SearchHit } from '../models.ts'
import { Switch } from './controls.tsx'
import { Field, Note } from './dialogs.tsx'

function readForm(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

export function ImportDialog(props: {
  baseId: string
  error: string
  busy: boolean
  onClose: () => void
  onSubmit: (input: { sourcePath: string; destCategory: string; preserveTree: boolean; createMissing: boolean }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  const [createMissing, setCreateMissing] = useState(true)
  const [preserveTree, setPreserveTree] = useState(false)
  return (
    <Modal
      open
      onClose={props.onClose}
      title={`导入到 ${props.baseId}`}
      className="zy-modal-form"
      footer={(
        <>
          <Button variant="ghost" type="button" onClick={props.onClose}>取消</Button>
          <Button variant="primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>开始导入</Button>
        </>
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
        <p className="zy-help">网页把本机路径交给主进程，不在浏览器里读文件。</p>
        <Field label="本机路径 *">
          <Input className="zy-input" name="sourcePath" placeholder="~/Downloads/供应商合同.md" required />
        </Field>
        <Field label="类目 destCategory" help="空 = 库根。可输入新路径，不会因此新建知识库。">
          <Input className="zy-input" name="destCategory" placeholder="合同/2024" />
        </Field>
        <div className="zy-toggle">
          <span>目录不存在则创建</span>
          <Switch on={createMissing} label="目录不存在则创建" onToggle={() => setCreateMissing((value) => !value)} />
        </div>
        <div className="zy-toggle">
          <span>保留源相对目录</span>
          <Switch on={preserveTree} label="保留源相对目录" onToggle={() => setPreserveTree((value) => !value)} />
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
          <Input className="zy-input zy-search-q" name="query" placeholder="违约条款" defaultValue={props.query} autoFocus />
          <Button variant="ghost" size="sm" type="submit" icon={<IconSearchOutline16 />} aria-label="搜索" disabled={props.busy} />
        </div>
      </form>
      <Note text={props.warning} />
      {props.busy ? <p className="zy-help">检索中…</p> : null}
      <div>
        {props.hits.map((hit) => (
          <button key={`${hit.n}-${hit.path}-${hit.startLine}`} className="zy-hit" type="button" onClick={() => props.onOpen(hit)}>
            <span className="zy-src">{hit.path}:{hit.startLine}</span>
            <span className="zy-hit-ex">{hit.excerpt.split('\n').find((line) => line.trim()) ?? ''}</span>
          </button>
        ))}
        {props.searched && !props.busy && !props.hits.length && !props.warning ? <p className="zy-help">无命中</p> : null}
      </div>
    </Modal>
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
        <>
          <Button variant="ghost" type="button" onClick={props.onDelete}>删除</Button>
          <Button variant="ghost" type="button" onClick={props.onClose}>取消</Button>
          <Button variant="primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>保存</Button>
        </>
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

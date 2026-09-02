import { useRef, useState, type DragEvent } from 'react'
import { Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SearchHit } from '../models.ts'
import { Field, Note } from './Dialogs.tsx'
import { SearchIcon } from './Icons.tsx'
import { MdEditor, type MdEditorHandle } from './MdEditor.tsx'

/** Import, search, and preview dialogs for the settings workbench. */
function readFormData(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

type DroppedFile = File & { path?: string }

function sourceDisplayName(sourcePath: string): string {
  const trimmedPath = sourcePath.replace(/[\\/]+$/, '')
  return trimmedPath.split(/[\\/]/).pop() || trimmedPath
}

function localPathFromUri(rawUri: string): string {
  try {
    const uri = new URL(rawUri)
    if (uri.protocol !== 'file:') return ''
    const decodedPath = decodeURIComponent(uri.pathname)
    if (uri.hostname && uri.hostname !== 'localhost') return `//${uri.hostname}${decodedPath}`
    return /^\/[A-Za-z]:\//.test(decodedPath) ? decodedPath.slice(1) : decodedPath
  } catch {
    return ''
  }
}

function droppedSourcePath(event: DragEvent<HTMLButtonElement>): string {
  const droppedFile = (event.dataTransfer.files.item(0) ?? event.dataTransfer.items[0]?.getAsFile()) as DroppedFile | null
  const filePath = droppedFile?.path?.trim()
  if (filePath) return filePath
  const uri = event.dataTransfer.getData('text/uri-list').split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))
  return uri ? localPathFromUri(uri) : ''
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
  const [createMissing, setCreateMissing] = useState(true)
  const [preserveTree, setPreserveTree] = useState(false)
  const [picking, setPicking] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [sourceError, setSourceError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false)

  const pick = async (kind: 'file' | 'dir') => {
    if (picking || props.busy) return
    setSourceMenuOpen(false)
    setPicking(true)
    try {
      const path = await props.onPick(kind)
      if (path) {
        setSourcePath(path)
        setSourceLabel(sourceDisplayName(path))
        setSourceError('')
      }
    } finally {
      setPicking(false)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = picking || props.busy ? 'none' : 'copy'
    if (!picking && !props.busy) setDragging(true)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragging(false)
    if (picking || props.busy) return
    setSourceMenuOpen(false)
    const path = droppedSourcePath(event)
    if (!path) {
      setSourceError('当前环境无法读取拖入项的本机路径，请使用“选择目录”或“选择文件”')
      return
    }
    setSourcePath(path)
    setSourceLabel(sourceDisplayName(path))
    setSourceError('')
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
          const data = readFormData(event)
          if (!sourcePath) {
            setSourceError('请拖入文件或文件夹，或点击选择按钮')
            return
          }
          props.onSubmit({
            sourcePath,
            destCategory: String(data.get('destCategory') ?? '').trim(),
            preserveTree,
            createMissing,
          })
        }}
      >
        <Field
          label="源"
          help="拖拽文件或文件夹，或点击按钮后选择目录/文件。目前支持 md / txt / markdown。"
        >
          <Menu
            open={sourceMenuOpen}
            onClose={() => setSourceMenuOpen(false)}
            items={[
              { id: 'dir', label: '选择目录' },
              { id: 'file', label: '选择文件' },
            ]}
            onSelect={(id: string) => {
              if (id !== 'dir' && id !== 'file') return
              void pick(id)
            }}
            align="start"
            portal
            anchor={(
              <button
                className={`zy-source-drop${dragging ? ' is-dragging' : ''}`}
                type="button"
                disabled={picking || props.busy}
                aria-haspopup="menu"
                aria-expanded={sourceMenuOpen}
                onClick={() => setSourceMenuOpen((value) => !value)}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <strong className="zy-source-copy">{sourceLabel ? `已选择：${sourceLabel}` : '拖拽或点击选择文件/文件夹'}</strong>
                <span className="zy-source-hint">{sourceLabel ? '可重新拖入，或点击按钮更换' : '只读取本机路径，不会修改源文件'}</span>
              </button>
            )}
          />
          <Note text={sourceError} />
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
  onOpenHit: (hit: SearchHit) => void
}) {
  return (
    <Modal open onClose={props.onClose} title={`搜索  ${props.baseId}`} className="zy-modal-form">
      <form
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          props.onSearch(String(readFormData(event).get('query') ?? ''))
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
            <button key={`${hit.n}-${hit.path}-${hit.startLine}`} className="zy-hit-line" type="button" onClick={() => props.onOpenHit(hit)}>
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
  const queryText = props.query.trim()
  const matchStart = queryText ? props.text.toLowerCase().indexOf(queryText.toLowerCase()) : -1
  if (matchStart < 0) return <>{props.text}</>
  return (
    <>
      {props.text.slice(0, matchStart)}
      <mark>{props.text.slice(matchStart, matchStart + queryText.length)}</mark>
      {props.text.slice(matchStart + queryText.length)}
    </>
  )
}

export function PreviewDialog(props: {
  entryPath: string
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
  const editorRef = useRef<MdEditorHandle>(null)
  const fileName = props.entryPath.split('/').pop() || props.entryPath
  return (
    <Modal
      open
      onClose={props.onClose}
      title={fileName}
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
        <MdEditor key={props.entryPath} text={props.text} readonly startLine={props.startLine} endLine={props.endLine} />
      ) : (
        <form
          ref={form}
          onSubmit={(event: { preventDefault: () => void }) => {
            event.preventDefault()
            if (!props.onSave) return
            props.onSave(editorRef.current?.getMarkdown() ?? props.text)
          }}
        >
          <MdEditor ref={editorRef} key={props.entryPath} text={props.text} readonly={false} />
        </form>
      )}
      <Note text={props.error} />
    </Modal>
  )
}

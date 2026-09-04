import { useEffect, useRef, useState, type DragEvent } from 'react'
import { WorkbenchModal } from './WorkbenchModal.tsx'
import type { SearchHit } from '../models.ts'
import { matchedExcerptLine } from '../search-utils.ts'
import { Field, Note } from './Dialogs.tsx'
import { SearchIcon } from './Icons.tsx'
import { claimFileDrag, fileToBase64, resolveDroppedSource, sourceDisplayName } from './drop-source-path.ts'

/** 设置工作台的导入、搜索与预览弹框。 */
function readFormData(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

export function ImportDialog(props: {
  baseTitle: string
  error: string
  busy: boolean
  onClose: () => void
  onPick: (kind: 'file' | 'dir') => Promise<string>
  onSubmit: (input: {
    sourcePath?: string
    sourceName?: string
    sourceBase64?: string
    destCategory: string
    preserveTree: boolean
    createMissing: boolean
  }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  const [createMissing, setCreateMissing] = useState(true)
  const [preserveTree, setPreserveTree] = useState(false)
  const [picking, setPicking] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [sourceError, setSourceError] = useState('')
  const [dragging, setDragging] = useState(false)

  const blocked = picking || props.busy
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked

  const applyDroppedPath = (dataTransfer: DataTransfer | null) => {
    setDragging(false)
    if (blockedRef.current) return
    const dropped = resolveDroppedSource(dataTransfer)
    if (dropped.kind === 'path') {
      setDroppedFile(null)
      setSourcePath(dropped.path)
      setSourceLabel(sourceDisplayName(dropped.path))
      setSourceError('')
      return
    }
    if (dropped.kind === 'file') {
      setSourcePath('')
      setDroppedFile(dropped.file)
      setSourceLabel(dropped.file.name)
      setSourceError('')
      return
    }
    if (dropped.kind === 'directory') {
      setSourceError('当前环境无法读取文件夹路径，请点击「选择文件夹」')
      return
    }
    setSourceError('没有读到可导入的文件，请改用选择按钮')
  }
  const applyDroppedPathRef = useRef(applyDroppedPath)
  applyDroppedPathRef.current = applyDroppedPath

  const pick = async (kind: 'file' | 'dir') => {
    if (blocked) return
    setPicking(true)
    try {
      const path = await props.onPick(kind)
      if (path) {
        setDroppedFile(null)
        setSourcePath(path)
        setSourceLabel(sourceDisplayName(path))
        setSourceError('')
      }
    } finally {
      setPicking(false)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!claimFileDrag(event, blocked ? 'none' : 'copy')) return
    if (!blocked) setDragging(true)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!claimFileDrag(event, blocked ? 'none' : 'copy')) return
    applyDroppedPath(event.dataTransfer)
  }

  useEffect(() => {
    const onDragOver = (event: globalThis.DragEvent) => {
      const dropEffect = blockedRef.current ? 'none' : 'copy'
      if (!claimFileDrag(event, dropEffect)) return
      if (!blockedRef.current) setDragging(true)
    }
    const onDrop = (event: globalThis.DragEvent) => {
      const dropEffect = blockedRef.current ? 'none' : 'copy'
      if (!claimFileDrag(event, dropEffect)) return
      applyDroppedPathRef.current(event.dataTransfer)
    }
    const onDragLeave = (event: globalThis.DragEvent) => {
      const leftViewport = event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight
      if (leftViewport) setDragging(false)
    }
    document.addEventListener('dragenter', onDragOver, true)
    document.addEventListener('dragover', onDragOver, true)
    document.addEventListener('drop', onDrop, true)
    document.addEventListener('dragleave', onDragLeave, true)
    return () => {
      document.removeEventListener('dragenter', onDragOver, true)
      document.removeEventListener('dragover', onDragOver, true)
      document.removeEventListener('drop', onDrop, true)
      document.removeEventListener('dragleave', onDragLeave, true)
    }
  }, [])

  const submitImport = () => {
    if (blocked) return
    const destCategory = String(form.current ? new FormData(form.current).get('destCategory') : '').trim()
    if (sourcePath) {
      props.onSubmit({ sourcePath, destCategory, preserveTree, createMissing })
      return
    }
    if (!droppedFile) {
      setSourceError('请拖入文件或文件夹，或点击选择按钮')
      return
    }
    setPicking(true)
    setSourceError('')
    void fileToBase64(droppedFile).then((sourceBase64) => {
      props.onSubmit({
        sourceName: droppedFile.name,
        sourceBase64,
        destCategory,
        preserveTree,
        createMissing,
      })
    }).catch(() => {
      setSourceError('读取拖入文件失败，请改用选择按钮')
    }).finally(() => {
      setPicking(false)
    })
  }

  const sourceDropzone = (
    <div
      className={`zy-source-drop${dragging ? ' is-dragging' : ''}`}
      role="group"
      aria-label="导入源"
      aria-busy={blocked}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <strong className="zy-source-copy">{sourceLabel ? `已选择：${sourceLabel}` : '拖拽文件或文件夹'}</strong>
      <span className="zy-source-hint">{sourceLabel ? '可重新拖入，或点击按钮更换' : '只读取本机路径，不会修改源文件'}</span>
      <div className="zy-source-actions">
        <button className="zy-btn zy-source-action" type="button" disabled={blocked} onClick={() => void pick('dir')}>选择文件夹</button>
        <button className="zy-btn zy-source-action" type="button" disabled={blocked} onClick={() => void pick('file')}>选择文件</button>
      </div>
    </div>
  )

  return (
    <WorkbenchModal
      open
      onClose={props.onClose}
      title={`导入到 ${props.baseTitle}`}
      className="zy-modal-form"
      footer={(
        <div className="zy-footbar">
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          <button className="zy-btn zy-primary" type="button" disabled={blocked} onClick={submitImport}>开始导入</button>
        </div>
      )}
    >
      <form
        ref={form}
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          event.preventDefault()
          submitImport()
        }}
      >
        <Field
          label="源"
          help="拖拽文件或文件夹，或点击下方按钮选择。支持 md / txt / markdown / csv（GBK、UTF-16 会转成 UTF-8）。"
        >
          {sourceDropzone}
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
    </WorkbenchModal>
  )
}

export function SearchDialog(props: {
  baseTitle: string
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
    <WorkbenchModal open onClose={props.onClose} title={`搜索 ${props.baseTitle}`} className="zy-modal-form">
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
            <button key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`} className="zy-hit-line" type="button" onClick={() => props.onOpenHit(hit)}>
              {hit.path}:{hit.matchLine}{' '}
              <HitMark text={matchedExcerptLine(hit)} query={props.query} />
            </button>
          ))}
        </div>
      ) : null}
      {props.searched && !props.busy && !props.hits.length && !props.warning ? <p className="zy-help">无命中</p> : null}
    </WorkbenchModal>
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

import { useEffect, useState } from 'react'
import { SECTION_LABEL } from '../../identity.ts'
import { kbCall, kbStatus, type Remote, type SessionsHandle, type WorkspacesHandle } from '../bridge.ts'
import type { BaseSummary, DialogKind, JobStatus, Prefs, SearchHit, TreeNode } from '../models.ts'
import { AboutPage } from './AboutPage.tsx'
import { IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { ConfirmDialog, CreateDialog, EditDialog } from './dialogs.tsx'
import { LibPage } from './LibPage.tsx'
import { ImportDialog, PreviewDialog, SearchDialog } from './more-dialogs.tsx'
import { PrefsPage } from './PrefsPage.tsx'
import { SectionIcon } from './SectionIcon.tsx'
import { ensureSettingsStyles } from './styles.ts'

type Tab = 'lib' | 'prefs' | 'about'

export function createSettingsSection(
  remote?: Remote,
  sessions?: SessionsHandle,
  workspaces?: WorkspacesHandle,
) {
  return function ZhiyuanSettings() {
    ensureSettingsStyles()
    const [tab, setTab] = useState('lib' as Tab)
    const [bases, setBases] = useState([] as BaseSummary[])
    const [currentId, setCurrentId] = useState('')
    const [tree, setTree] = useState([] as TreeNode[])
    const [prefs, setPrefs] = useState({ defaultBaseId: '', maxFileBytes: 5_242_880, maxBaseBytes: 10_737_418_240 } as Prefs)
    const [job, setJob] = useState(undefined as JobStatus | undefined)
    const [dialog, setDialog] = useState(null as DialogKind)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState('')
    const [note, setNote] = useState('')
    const [hits, setHits] = useState([] as SearchHit[])
    const [query, setQuery] = useState('')
    const [searched, setSearched] = useState(false)
    const [searchBusy, setSearchBusy] = useState(false)
    const [previewFrom, setPreviewFrom] = useState('tree' as 'tree' | 'search')
    const [preview, setPreview] = useState({ path: '', text: '', readonly: false, startLine: 0, endLine: 0 })
    const [confirm, setConfirm] = useState({ message: '', run: async () => undefined as void })

    const current = bases.find((item) => item.id === currentId)
    const call = (payload: Record<string, unknown>) => kbCall(remote, sessions, workspaces, payload)

    const refresh = async (id?: string) => {
      setPending(true)
      setNote('')
      try {
        const list = await call({ op: 'list' }) as BaseSummary[]
        setBases(list)
        const nextId = id || currentId || list.find((item) => item.lastUsed)?.id || list[0]?.id || ''
        setCurrentId(nextId)
        if (nextId) setTree(await call({ op: 'tree', id: nextId }) as TreeNode[])
        else setTree([])
        setPrefs(await call({ op: 'prefs' }) as Prefs)
        setJob(await kbStatus(remote, sessions, workspaces) as JobStatus)
      } catch (err) {
        setNote(err instanceof Error ? err.message : String(err))
      } finally {
        setPending(false)
      }
    }

    useEffect(() => { void refresh() }, [])

    const run = async (work: () => Promise<void>) => {
      setError('')
      setPending(true)
      try {
        await work()
        setDialog(null)
        await refresh(currentId)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setPending(false)
      }
    }

    const aliases = (text: string) => text.split(/[,，]/).map((item) => item.trim()).filter(Boolean)

    return (
      <div className="zy">
        <div className="zy-head">
          <div className="zy-head-title">
            <SectionIcon size={18} />
            <h1>{SECTION_LABEL}</h1>
          </div>
          <div className="zy-tabs" role="tablist">
            {(['lib', 'prefs', 'about'] as Tab[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'zy-tab is-on' : 'zy-tab'}
                onClick={() => setTab(id)}
              >
                {id === 'lib' ? '库' : id === 'prefs' ? '偏好' : '关于'}
              </button>
            ))}
          </div>
        </div>
        {note ? (
          <p className="zy-note">
            <IconWarningOutline16 size={14} />
            {note}
          </p>
        ) : null}
        <div className="zy-body">
          {tab === 'lib' ? (
            <LibPage
              bases={bases}
              current={current}
              tree={tree}
              job={job}
              pending={pending}
              onSelect={(id) => { setCurrentId(id); void refresh(id) }}
              onCreate={() => { setError(''); setDialog('create') }}
              onEdit={() => { setError(''); setDialog('edit') }}
              onImport={() => { setError(''); setDialog('import') }}
              onSearch={() => {
                setHits([])
                setQuery('')
                setSearched(false)
                setError('')
                setDialog('search')
              }}
              onDeleteBase={(base) => {
                setConfirm({ message: `删除知识库「${base.title}」及其中文件？`, run: () => run(() => call({ op: 'deleteBase', id: base.id, confirm: true }).then(() => undefined)) })
                setDialog('confirm')
              }}
              onOpenFile={(path) => {
                void call({ op: 'read', id: currentId, path }).then((value) => {
                  const rec = value as { path: string; text: string }
                  setPreview({ path: rec.path, text: rec.text, readonly: false, startLine: 0, endLine: 0 })
                  setPreviewFrom('tree')
                  setDialog('preview')
                }).catch((err) => setNote(err instanceof Error ? err.message : String(err)))
              }}
              onDeleteEntry={(path, kind) => {
                setConfirm({
                  message: kind === 'dir' ? `删除类目「${path}」？` : `删除文件「${path}」？`,
                  run: () => run(() => call({ op: 'deleteEntry', id: currentId, path, confirm: true }).then(() => undefined)),
                })
                setDialog('confirm')
              }}
            />
          ) : null}
          {tab === 'prefs' ? <PrefsPage prefs={prefs} bases={bases} busy={pending} error={error} onSave={(next) => void run(() => call({ op: 'setPrefs', ...next }).then(() => undefined))} /> : null}
          {tab === 'about' ? <AboutPage /> : null}
        </div>

        {dialog === 'create' ? (
          <CreateDialog error={error} busy={pending} onClose={() => setDialog(null)} onSubmit={(input) => void run(() => call({ op: 'create', ...input, aliases: aliases(input.aliases) }).then(() => undefined))} />
        ) : null}
        {dialog === 'edit' && current ? (
          <EditDialog
            base={current}
            error={error}
            busy={pending}
            onClose={() => setDialog(null)}
            onDelete={() => {
              setConfirm({ message: `删除知识库「${current.title}」及其中文件？`, run: () => run(() => call({ op: 'deleteBase', id: current.id, confirm: true }).then(() => undefined)) })
              setDialog('confirm')
            }}
            onSubmit={(input) => void run(() => call({ op: 'update', id: current.id, ...input, aliases: aliases(input.aliases) }).then(() => undefined))}
          />
        ) : null}
        {dialog === 'import' && current ? (
          <ImportDialog
            baseId={current.id}
            error={error}
            busy={pending}
            onClose={() => setDialog(null)}
            onSubmit={(input) => void run(() => call({ op: 'ingest', ...input, baseId: current.id }).then(() => undefined))}
          />
        ) : null}
        {dialog === 'search' && current ? (
          <SearchDialog
            baseId={current.id}
            query={query}
            hits={hits}
            warning={error}
            busy={searchBusy}
            searched={searched}
            onClose={() => setDialog(null)}
            onSearch={(next) => {
              setQuery(next)
              setSearchBusy(true)
              setError('')
              void call({ op: 'search', baseId: current.id, query: next }).then((value) => {
                const result = value as { hits: SearchHit[]; warnings?: string[] }
                setHits(result.hits)
                setError(result.warnings?.join(' ') ?? '')
                setSearched(true)
              }).catch((err) => {
                setHits([])
                setError(err instanceof Error ? err.message : String(err))
                setSearched(true)
              }).finally(() => setSearchBusy(false))
            }}
            onOpen={(hit) => {
              void call({ op: 'read', id: current.id, path: hit.path }).then((value) => {
                const rec = value as { path: string; text: string }
                setPreview({ path: rec.path, text: rec.text, readonly: true, startLine: hit.startLine, endLine: hit.endLine })
                setPreviewFrom('search')
                setDialog('preview')
              }).catch((err) => setError(err instanceof Error ? err.message : String(err)))
            }}
          />
        ) : null}
        {dialog === 'preview' ? (
          <PreviewDialog
            path={preview.path}
            text={preview.text}
            startLine={preview.startLine}
            endLine={preview.endLine}
            readonly={preview.readonly}
            error={error}
            busy={pending}
            onClose={() => setDialog(previewFrom === 'search' ? 'search' : null)}
            onSave={(text) => void run(() => call({ op: 'write', id: currentId, path: preview.path, text }).then(() => undefined))}
            onDelete={() => {
              setConfirm({
                message: `删除文件「${preview.path}」？`,
                run: () => run(() => call({ op: 'deleteEntry', id: currentId, path: preview.path, confirm: true }).then(() => undefined)),
              })
              setDialog('confirm')
            }}
          />
        ) : null}
        {dialog === 'confirm' ? (
          <ConfirmDialog message={confirm.message} busy={pending} onClose={() => setDialog(null)} onConfirm={() => void confirm.run()} />
        ) : null}
      </div>
    )
  }
}

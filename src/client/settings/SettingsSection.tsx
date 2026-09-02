import { useEffect, useState } from 'react'
import { SECTION_LABEL } from '../../identity.ts'
import { kbCall, kbStatus, type Remote, type SessionsHandle, type WorkspacesHandle } from '../bridge.ts'
import type { BaseSummary, DialogKind, JobStatus, Prefs, ReadEntryResult, SearchHit, TreeNode } from '../models.ts'
import { AboutPage } from './AboutPage.tsx'
import { IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { ConfirmDialog, CreateDialog, EditDialog } from './Dialogs.tsx'
import { BasePage } from './BasePage.tsx'
import { ImportDialog, PreviewDialog, SearchDialog } from './AdditionalDialogs.tsx'
import { PrefsPage } from './PrefsPage.tsx'
import { SectionIcon } from './SectionIcon.tsx'
import { ensureSettingsStyles } from './styles.ts'

type SettingsTab = 'bases' | 'prefs' | 'about'

/** Creates the settings section and wires UI actions to the Host bridge. */
export function createSettingsSection(
  remote?: Remote,
  sessions?: SessionsHandle,
  workspaces?: WorkspacesHandle,
) {
  return function ZhiyuanSettings() {
    ensureSettingsStyles()
    const [tab, setTab] = useState('bases' as SettingsTab)
    const [bases, setBases] = useState([] as BaseSummary[])
    const [currentBaseId, setCurrentBaseId] = useState('')
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
    const [previewOrigin, setPreviewOrigin] = useState('tree' as 'tree' | 'search')
    const [preview, setPreview] = useState({ entryPath: '', text: '', readonly: false, startLine: 0, endLine: 0, focusLine: 0 })
    const [confirm, setConfirm] = useState({ message: '', run: async () => undefined as void })

    const currentBase = bases.find((item) => item.id === currentBaseId)
    const call = (payload: Record<string, unknown>) => kbCall(remote, sessions, workspaces, payload)

    const refresh = async (baseId?: string) => {
      setPending(true)
      setNote('')
      try {
        const list = await call({ op: 'list' }) as BaseSummary[]
        setBases(list)
        const nextBaseId = baseId || currentBaseId || list.find((item) => item.lastUsed)?.id || list[0]?.id || ''
        setCurrentBaseId(nextBaseId)
        if (nextBaseId) setTree(await call({ op: 'tree', id: nextBaseId }) as TreeNode[])
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
        await refresh(currentBaseId)
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
            {(['bases', 'prefs', 'about'] as SettingsTab[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'zy-tab is-on' : 'zy-tab'}
                onClick={() => setTab(id)}
              >
                {id === 'bases' ? '知识库' : id === 'prefs' ? '偏好' : '关于'}
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
        <div className={tab === 'bases' ? 'zy-body' : 'zy-body is-doc'}>
          {tab === 'bases' ? (
            <BasePage
              bases={bases}
              currentBase={currentBase}
              tree={tree}
              job={job}
              pending={pending}
              onSelectBase={(baseId) => { setCurrentBaseId(baseId); void refresh(baseId) }}
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
              onOpenEntry={(entryPath) => {
                void call({ op: 'read', id: currentBaseId, path: entryPath }).then((value) => {
                  const entry = value as ReadEntryResult
                  setPreview({ entryPath: entry.path, text: entry.text, readonly: false, startLine: 0, endLine: 0, focusLine: 0 })
                  setPreviewOrigin('tree')
                  setDialog('preview')
                }).catch((err) => setNote(err instanceof Error ? err.message : String(err)))
              }}
              onDeleteEntry={(entryPath, kind) => {
                setConfirm({
                  message: kind === 'dir' ? `删除类目「${entryPath}」？` : `删除文件「${entryPath}」？`,
                  run: () => run(() => call({ op: 'deleteEntry', id: currentBaseId, path: entryPath, confirm: true }).then(() => undefined)),
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
        {dialog === 'edit' && currentBase ? (
          <EditDialog
            base={currentBase}
            error={error}
            busy={pending}
            onClose={() => setDialog(null)}
            onDelete={() => {
              setConfirm({ message: `删除知识库「${currentBase.title}」及其中文件？`, run: () => run(() => call({ op: 'deleteBase', id: currentBase.id, confirm: true }).then(() => undefined)) })
              setDialog('confirm')
            }}
            onSubmit={(input) => void run(() => call({ op: 'update', id: currentBase.id, ...input, aliases: aliases(input.aliases) }).then(() => undefined))}
          />
        ) : null}
        {dialog === 'import' && currentBase ? (
          <ImportDialog
            baseId={currentBase.id}
            error={error}
            busy={pending}
            onClose={() => setDialog(null)}
            onPick={async (kind) => {
              setError('')
              try {
                const pickResult = await call({ op: 'pick', kind }) as { path?: string }
                return pickResult.path ?? ''
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
                return ''
              }
            }}
            onSubmit={(input) => void run(() => call({ op: 'ingest', ...input, baseId: currentBase.id }).then(() => undefined))}
          />
        ) : null}
        {dialog === 'search' && currentBase ? (
          <SearchDialog
            baseId={currentBase.id}
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
              void call({ op: 'search', baseId: currentBase.id, query: next }).then((value) => {
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
            onOpenHit={(hit) => {
              void call({ op: 'read', id: currentBase.id, path: hit.path }).then((value) => {
                const entry = value as ReadEntryResult
                setPreview({ entryPath: entry.path, text: entry.text, readonly: true, startLine: hit.startLine, endLine: hit.endLine, focusLine: hit.matchLine })
                setPreviewOrigin('search')
                setDialog('preview')
              }).catch((err) => setError(err instanceof Error ? err.message : String(err)))
            }}
          />
        ) : null}
        {dialog === 'preview' ? (
          <PreviewDialog
            entryPath={preview.entryPath}
            text={preview.text}
            startLine={preview.startLine}
            endLine={preview.endLine}
            focusLine={preview.focusLine}
            readonly={preview.readonly}
            error={error}
            busy={pending}
            onClose={() => setDialog(previewOrigin === 'search' ? 'search' : null)}
            onSave={(text) => void run(() => call({ op: 'write', id: currentBaseId, path: preview.entryPath, text }).then(() => undefined))}
            onDelete={() => {
              setConfirm({
                message: `删除文件「${preview.entryPath}」？`,
                run: () => run(() => call({ op: 'deleteEntry', id: currentBaseId, path: preview.entryPath, confirm: true }).then(() => undefined)),
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

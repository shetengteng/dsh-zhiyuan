import { useEffect, useState } from 'react'
import { SECTION_LABEL } from '../../identity.ts'
import type { KnowledgePrivateConnection } from '../bridge.ts'
import type { DialogKind, IngestResult, SearchHit } from '../models.ts'
import { parseIngestResult, parseSearchResult, parseTableEditorPage } from '../host-payload.ts'
import { useWorkbenchData, splitAliases } from './use-workbench-data.ts'
import { useEntryPreview } from './use-entry-preview.ts'
import { AboutPage } from './AboutPage.tsx'
import { IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { ConfirmDialog, CreateDialog, EditDialog } from './Dialogs.tsx'
import { BasePage } from './BasePage.tsx'
import { ImportDialog, SearchDialog } from './AdditionalDialogs.tsx'
import { PreviewDialog } from './preview/PreviewDialog.tsx'
import { PrefsPage } from './PrefsPage.tsx'
import { SectionIcon } from './SectionIcon.tsx'
import { ensureSettingsStyles } from './styles.ts'

type SettingsTab = 'bases' | 'prefs' | 'about'

/** 创建设置 section，并把 UI 操作接到 Host bridge。 */
export function createSettingsSection(
  connection?: KnowledgePrivateConnection,
) {
  return function ZhiyuanSettings() {
    ensureSettingsStyles()
    const [tab, setTab] = useState('bases' as SettingsTab)
    const [dialog, setDialog] = useState(null as DialogKind)
    const [hits, setHits] = useState([] as SearchHit[])
    const [query, setQuery] = useState('')
    const [searched, setSearched] = useState(false)
    const [searchBusy, setSearchBusy] = useState(false)
    const [confirm, setConfirm] = useState({ message: '', run: async () => undefined as void })

    const { bases, currentBaseId, setCurrentBaseId, tree, prefs, job, pending, error, note, setError, setNote, call, refresh, run: runWork } = useWorkbenchData(connection)
    const { preview, previewFallback, previewOrigin, openTreeEntry, openSearchHit, cancelPreviews } = useEntryPreview({
      call,
      onOpened: () => setDialog('preview'),
      onTreeError: (message) => setNote(message),
      onSearchError: (message) => setError(message),
    })

    const currentBase = bases.find((item) => item.id === currentBaseId)

    const run = <T,>(work: () => Promise<T>, after?: (value: T) => void) => runWork(work, { onSuccess: () => setDialog(null), after })

    useEffect(() => { void refresh() }, [])

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
              onOpenEntry={(entryPath) => openTreeEntry(currentBaseId, entryPath)}
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
          <CreateDialog error={error} busy={pending} onClose={() => setDialog(null)} onSubmit={(input) => void run(() => call({ op: 'create', ...input, aliases: splitAliases(input.aliases) }).then(() => undefined))} />
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
            onSubmit={(input) => void run(() => call({ op: 'update', id: currentBase.id, ...input, aliases: splitAliases(input.aliases) }).then(() => undefined))}
          />
        ) : null}
        {dialog === 'import' && currentBase ? (
          <ImportDialog
            baseTitle={currentBase.title}
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
            onSubmit={(input) => void run(
              () => call({ op: 'ingest', ...input, baseId: currentBase.id }).then(parseIngestResult),
              (result) => setNote(formatIngestNotice(result)),
            )}
          />
        ) : null}
        {dialog === 'search' && currentBase ? (
          <SearchDialog
            baseTitle={currentBase.title}
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
                const result = parseSearchResult(value)
                setHits(result.hits)
                setError(result.warnings?.join(' ') ?? '')
                setSearched(true)
              }).catch((err) => {
                setHits([])
                setError(err instanceof Error ? err.message : String(err))
                setSearched(true)
              }).finally(() => setSearchBusy(false))
            }}
            onOpenHit={(hit) => openSearchHit(currentBase.id, hit)}
          />
        ) : null}
        {dialog === 'preview' && preview ? (
          <PreviewDialog
            preview={preview}
            editable={previewOrigin === 'tree'}
            deletable={previewOrigin === 'tree'}
            error={error}
            busy={pending}
            fallbackText={previewFallback || undefined}
            onClose={() => { cancelPreviews(); setDialog(previewOrigin === 'search' ? 'search' : null) }}
            onSave={(change) => void run(() => call({ op: 'write', id: currentBaseId, path: preview.path, change }).then(() => undefined))}
            onLoadPage={(startRow) => call({ op: 'readPage', id: currentBaseId, path: preview.path, startRow }).then(parseTableEditorPage)}
            onDelete={() => {
              setConfirm({
                message: `删除文件「${preview.path}」？`,
                run: () => run(() => call({ op: 'deleteEntry', id: currentBaseId, path: preview.path, confirm: true }).then(() => undefined)),
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

function formatIngestNotice(result: IngestResult): string {
  if (!result.failed) return `导入完成：新增 ${result.copied.length}，跳过 ${result.skipped}`
  const details = result.files
    .filter((item) => item.status === 'failed')
    .slice(0, 2)
    .map((item) => `${item.sourceRelPath}：${item.reason ?? '处理失败'}`)
    .join('；')
  return `导入完成：新增 ${result.copied.length}，跳过 ${result.skipped}，失败 ${result.failed}${details ? `。${details}` : ''}`
}

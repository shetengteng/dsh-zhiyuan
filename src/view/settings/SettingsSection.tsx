import { useEffect, useRef, useState } from 'react'
import { SECTION_LABEL, VERSION_LABEL } from '../../model/constants.ts'
import type { KnowledgePrivateConnection } from '../bridge.ts'
import type { DialogKind, ImportResponse, SearchOverviewResult, SearchResult } from '../types.ts'
import { parseImportResponse } from '../payload/import-result.ts'
import { parseCatalogPrefs, parseOperationAck, parsePickSourceResult } from '../payload/settings-response.ts'
import { parseTableEditorPage } from '../payload/table-page.ts'
import { canSearchNextPage, canSearchPreviousPage, type SearchPageHistory } from '../search/search-pages.ts'
import { useWorkbenchData, splitAliases, type WorkbenchNotice } from './use-workbench-data.ts'
import { useEntryPreview } from './use-entry-preview.ts'
import { createSearchActions } from './search-actions.ts'
import { AboutPage } from './AboutPage.tsx'
import { IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { ConfirmDialog, CreateDialog, EditDialog } from './dialogs/KbDialogs.tsx'
import { KbPage } from './KbPage.tsx'
import { ImportDialog } from './dialogs/ImportDialogs.tsx'
import { SearchDialog } from './dialogs/SearchDialog.tsx'
import { PreviewDialog } from './preview/PreviewDialog.tsx'
import { PrefsPage } from './PrefsPage.tsx'
import { SectionIcon } from './SectionIcon.tsx'
import { ensureSettingsStyles } from './styles.ts'

type SettingsTab = 'kbs' | 'prefs' | 'about'

/** 创建设置 section，并把 UI 操作接到 Host bridge。 */
export function createSettingsSection(connection?: KnowledgePrivateConnection) {
  return function ZhiyuanSettings() {
    ensureSettingsStyles()
    const [tab, setTab] = useState('kbs' as SettingsTab)
    const [dialog, setDialog] = useState(null as DialogKind)
    const [query, setQuery] = useState('')
    const [searched, setSearched] = useState(false)
    const [searchBusy, setSearchBusy] = useState(false)
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
    const [searchOverviewResult, setSearchOverviewResult] = useState<SearchOverviewResult | null>(null)
    const [searchDetailHistory, setSearchDetailHistory] = useState<SearchPageHistory | null>(null)
    const [searchOpeningPath, setSearchOpeningPath] = useState('')
    const [searchError, setSearchError] = useState('')
    const searchRequestVersion = useRef(0)
    const [confirm, setConfirm] = useState({ message: '', run: async () => undefined as void })

    const { kbs, currentKbId, setCurrentKbId, tree, prefs, job, pending, error, notice, setError, setNotice, call, refresh, run: runWork } = useWorkbenchData(connection)
    const { preview, previewFallback, previewOrigin, openTreeEntry, openSearchHit, cancelPreviews } = useEntryPreview({
      call,
      onOpened: () => setDialog('preview'),
      onTreeError: (message) => setNotice({ tone: 'error', text: message }),
      onSearchError: (message) => setError(message),
    })

    const currentKb = kbs.find((item) => item.id === currentKbId)
    const run = <T,>(work: () => Promise<T>, after?: (value: T) => void) => runWork(work, { onSuccess: () => setDialog(null), after })

    useEffect(() => {
      void refresh()
      return () => {
        searchRequestVersion.current += 1
      }
    }, [])

    const resetSearch = () => {
      searchRequestVersion.current += 1
      setQuery('')
      setSearched(false)
      setSearchBusy(false)
      setSearchResult(null)
      setSearchOverviewResult(null)
      setSearchDetailHistory(null)
      setSearchOpeningPath('')
      setSearchError('')
    }

    const searchActions = createSearchActions({
      kbId: currentKbId,
      call,
      searchResult,
      searchOverviewResult,
      searchDetailHistory,
      searchBusy,
      searchRequestVersion,
      setQuery,
      setSearched,
      setSearchBusy,
      setSearchResult,
      setSearchOverviewResult,
      setSearchDetailHistory,
      setSearchOpeningPath,
      setSearchError,
    })

    return (
      <div className="zy">
        <div className="zy-head">
          <div className="zy-head-title"><SectionIcon size={18} /><h1>{SECTION_LABEL}</h1><span className="zy-sub">{VERSION_LABEL}</span></div>
          <div className="zy-tabs" role="tablist">
            {(['kbs', 'prefs', 'about'] as SettingsTab[]).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'zy-tab is-on' : 'zy-tab'} onClick={() => setTab(id)}>
                {id === 'kbs' ? '知识库' : id === 'prefs' ? '偏好' : '关于'}
              </button>
            ))}
          </div>
        </div>
        {notice ? <p className={`zy-note is-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.tone === 'success' ? null : <IconWarningOutline16 size={14} />}{notice.text}</p> : null}
        <div className={tab === 'kbs' ? 'zy-body' : 'zy-body is-doc'}>
          {tab === 'kbs' ? (
            <KbPage
              kbs={kbs}
              currentKb={currentKb}
              tree={tree}
              job={job}
              pending={pending}
              onSelectKb={(kbId) => { setCurrentKbId(kbId); void refresh(kbId) }}
              onCreate={() => { setError(''); setDialog('create') }}
              onEdit={() => { setError(''); setDialog('edit') }}
              onImport={() => { setError(''); setNotice(null); setDialog('import') }}
              onSearch={() => { resetSearch(); setError(''); setDialog('search') }}
              onDeleteKb={(kb) => {
                setConfirm({ message: `删除知识库「${kb.title}」及其中文件？`, run: () => run(() => call({ op: 'deleteKb', id: kb.id, confirm: true }).then(parseOperationAck).then(() => undefined)) })
                setDialog('confirm')
              }}
              onOpenEntry={(entryPath) => openTreeEntry(currentKbId, entryPath)}
              onDeleteEntry={(entryPath, kind) => {
                setConfirm({
                  message: kind === 'dir' ? `删除类目「${entryPath}」？` : `删除文件「${entryPath}」？`,
                  run: () => run(() => call({ op: 'deleteEntry', id: currentKbId, path: entryPath, confirm: true }).then(parseOperationAck).then(() => undefined)),
                })
                setDialog('confirm')
              }}
            />
          ) : null}
          {tab === 'prefs' ? <PrefsPage prefs={prefs} kbs={kbs} busy={pending} error={error} onSave={(next) => void run(() => call({ op: 'setPrefs', ...next }).then(parseCatalogPrefs).then(() => undefined))} /> : null}
          {tab === 'about' ? <AboutPage /> : null}
        </div>

        {dialog === 'create' ? <CreateDialog error={error} busy={pending} onClose={() => setDialog(null)} onSubmit={(input) => void run(() => call({ op: 'create', ...input, aliases: splitAliases(input.aliases) }).then(() => undefined))} /> : null}
        {dialog === 'edit' && currentKb ? (
          <EditDialog
            kb={currentKb}
            error={error}
            busy={pending}
            onClose={() => setDialog(null)}
            onDelete={() => {
              setConfirm({ message: `删除知识库「${currentKb.title}」及其中文件？`, run: () => run(() => call({ op: 'deleteKb', id: currentKb.id, confirm: true }).then(parseOperationAck).then(() => undefined)) })
              setDialog('confirm')
            }}
            onSubmit={(input) => void run(() => call({ op: 'update', id: currentKb.id, ...input, aliases: splitAliases(input.aliases) }).then(() => undefined))}
          />
        ) : null}
        {dialog === 'import' && currentKb ? (
          <ImportDialog
            kbTitle={currentKb.title}
            error={error}
            busy={pending}
            onClose={() => setDialog(null)}
            onPick={async (kind) => {
              setError('')
              try {
                const pickResult = parsePickSourceResult(await call({ op: 'pick', kind }))
                return 'cancelled' in pickResult ? '' : pickResult.path
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
                return ''
              }
            }}
            onSubmit={(input) => void run(
              () => call({ op: 'import', ...input, kbId: currentKb.id }).then(parseImportResponse),
              (result) => setNotice(formatImportNotice(result)),
            )}
          />
        ) : null}
        {dialog === 'search' && currentKb ? (
          <SearchDialog
            kbTitle={currentKb.title}
            query={query}
            result={searchResult}
            warning={searchError}
            busy={searchBusy}
            searched={searched}
            openingPath={searchOpeningPath || undefined}
            onClose={() => { searchRequestVersion.current += 1; setDialog(null) }}
            onSearch={searchActions.onSearch}
            onOpenFile={searchActions.onOpenFile}
            onBack={searchActions.onBack}
            onLoadMore={searchActions.onLoadMore}
            onPreviousPage={searchActions.onPreviousPage}
            onNextPage={searchActions.onNextPage}
            canPreviousPage={canSearchPreviousPage(searchDetailHistory)}
            canNextPage={canSearchNextPage(searchDetailHistory)}
            onOpenHit={(hit) => openSearchHit(currentKb.id, hit)}
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
            onSave={(change) => void run(() => call({ op: 'write', id: currentKbId, path: preview.path, change }).then(parseOperationAck).then(() => undefined))}
            onLoadPage={(startRow) => call({ op: 'readPage', id: currentKbId, path: preview.path, startRow }).then(parseTableEditorPage)}
            onDelete={() => {
              setConfirm({ message: `删除文件「${preview.path}」？`, run: () => run(() => call({ op: 'deleteEntry', id: currentKbId, path: preview.path, confirm: true }).then(parseOperationAck).then(() => undefined)) })
              setDialog('confirm')
            }}
          />
        ) : null}
        {dialog === 'confirm' ? <ConfirmDialog message={confirm.message} error={error} busy={pending} onClose={() => setDialog(null)} onConfirm={() => void confirm.run()} /> : null}
      </div>
    )
  }
}

function formatImportNotice(result: ImportResponse): WorkbenchNotice {
  const summary = `导入完成：新增 ${result.copied.length}，跳过 ${result.skipped}`
  if (!result.failed) return { tone: 'success', text: summary }
  const details = result.files.filter((item) => item.status === 'failed').slice(0, 2).map((item) => `${item.sourceRelPath}：${item.reason ?? '处理失败'}`).join('；')
  return { tone: result.copied.length > 0 || result.skipped > 0 ? 'warning' : 'error', text: `${summary}，失败 ${result.failed}${details ? `。${details}` : ''}` }
}

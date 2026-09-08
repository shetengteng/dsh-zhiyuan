import type { Dispatch, SetStateAction } from 'react'
import type { EntryWriteChange, TableEditorPage } from '../../content/api.ts'
import type { BaseSummary, CatalogPrefs as Prefs, DialogKind, ImportResult, SearchHit } from '../types.ts'
import { parseImportResult } from '../payload/import-result.ts'
import { parseTableEditorPage } from '../payload/table-page.ts'
import { splitAliases, type WorkbenchNotice } from './use-workbench-data.ts'

type HostCall = (payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>
type WorkbenchRun = <T>(work: () => Promise<T>, after?: (value: T) => void) => void

export type BaseFormInput = {
  title: string
  description: string
  aliases: string
}

export type ImportFormInput = {
  sourcePath?: string
  sourceName?: string
  sourceBase64?: string
  destCategory: string
  preserveTree: boolean
  createMissing: boolean
}

export type ConfirmAction = {
  message: string
  run: () => void
}

type SettingsActionOptions = {
  currentBaseId: string
  currentBase?: BaseSummary
  previewOrigin: 'tree' | 'search'
  call: HostCall
  run: WorkbenchRun
  refresh: (baseId?: string) => Promise<void>
  resetSearch: () => void
  setCurrentBaseId: Dispatch<SetStateAction<string>>
  setDialog: Dispatch<SetStateAction<DialogKind>>
  setError: (message: string) => void
  setNotice: Dispatch<SetStateAction<WorkbenchNotice | null>>
  setConfirm: Dispatch<SetStateAction<ConfirmAction>>
  openTreeEntry: (baseId: string, entryPath: string) => void
  openSearchHit: (baseId: string, hit: SearchHit) => void
  cancelPreviews: () => void
}

export type SettingsActionHandlers = {
  onSelectBase: (baseId: string) => void
  onCreate: () => void
  onEdit: () => void
  onImport: () => void
  onSearch: () => void
  onDeleteBase: (base: BaseSummary) => void
  onOpenEntry: (entryPath: string) => void
  onDeleteEntry: (entryPath: string, kind: 'file' | 'dir') => void
  onSavePrefs: (prefs: Prefs) => void
  onCreateBase: (input: BaseFormInput) => void
  onEditBase: (input: BaseFormInput) => void
  onDeleteCurrentBase: () => void
  onPickImportSource: (kind: 'file' | 'dir') => Promise<string>
  onSubmitImport: (input: ImportFormInput) => void
  onClosePreview: () => void
  onSavePreview: (path: string, change: EntryWriteChange) => void
  onLoadTablePage: (path: string, startRow: number) => Promise<TableEditorPage>
  onDeletePreview: (path: string) => void
  onOpenSearchHit: (hit: SearchHit) => void
}

export function createSettingsActions(options: SettingsActionOptions): SettingsActionHandlers {
  const onSelectBase = (baseId: string): void => {
    options.setCurrentBaseId(baseId)
    void options.refresh(baseId)
  }

  const onCreate = (): void => {
    options.setError('')
    options.setDialog('create')
  }

  const onEdit = (): void => {
    options.setError('')
    options.setDialog('edit')
  }

  const onImportDialog = (): void => {
    options.setError('')
    options.setNotice(null)
    options.setDialog('import')
  }

  const onSearch = (): void => {
    options.resetSearch()
    options.setError('')
    options.setDialog('search')
  }

  const confirmDelete = (message: string, payload: Record<string, unknown>): void => {
    options.setConfirm({
      message,
      run: () => options.run(() => options.call(payload).then(() => undefined)),
    })
    options.setDialog('confirm')
  }

  const onDeleteBase = (base: BaseSummary): void => {
    confirmDelete(`删除知识库「${base.title}」及其中文件？`, { op: 'deleteBase', id: base.id, confirm: true })
  }

  const onOpenEntry = (entryPath: string): void => {
    options.openTreeEntry(options.currentBaseId, entryPath)
  }

  const onDeleteEntry = (entryPath: string, kind: 'file' | 'dir'): void => {
    const label = kind === 'dir' ? `删除类目「${entryPath}」？` : `删除文件「${entryPath}」？`
    confirmDelete(label, { op: 'deleteEntry', id: options.currentBaseId, path: entryPath, confirm: true })
  }

  const onSavePrefs = (prefs: Prefs): void => {
    options.run(() => options.call({ op: 'setPrefs', ...prefs }).then(() => undefined))
  }

  const onCreateBase = (input: BaseFormInput): void => {
    options.run(() => options.call({ op: 'create', ...input, aliases: splitAliases(input.aliases) }).then(() => undefined))
  }

  const onEditBase = (input: BaseFormInput): void => {
    options.run(() => options.call({
      op: 'update',
      id: options.currentBaseId,
      ...input,
      aliases: splitAliases(input.aliases),
    }).then(() => undefined))
  }

  const onDeleteCurrentBase = (): void => {
    const base = options.currentBase
    if (!base) return
    onDeleteBase(base)
  }

  const onPickImportSource = async (kind: 'file' | 'dir'): Promise<string> => {
    options.setError('')
    try {
      const result = await options.call({ op: 'pick', kind })
      if (!result || typeof result !== 'object' || Array.isArray(result)) return ''
      const path = 'path' in result && typeof result.path === 'string' ? result.path : ''
      return path
    } catch (error) {
      options.setError(error instanceof Error ? error.message : String(error))
      return ''
    }
  }

  const onSubmitImport = (input: ImportFormInput): void => {
    options.run(
      () => options.call({ op: 'import', ...input, baseId: options.currentBaseId }).then(parseImportResult),
      (result) => options.setNotice(formatImportNotice(result)),
    )
  }

  const onClosePreview = (): void => {
    options.cancelPreviews()
    options.setDialog(options.previewOrigin === 'search' ? 'search' : null)
  }

  const onSavePreview = (path: string, change: EntryWriteChange): void => {
    options.run(() => options.call({ op: 'write', id: options.currentBaseId, path, change }).then(() => undefined))
  }

  const onLoadTablePage = (path: string, startRow: number): Promise<TableEditorPage> => {
    return options.call({ op: 'readPage', id: options.currentBaseId, path, startRow }).then(parseTableEditorPage)
  }

  const onDeletePreview = (path: string): void => {
    confirmDelete(`删除文件「${path}」？`, { op: 'deleteEntry', id: options.currentBaseId, path, confirm: true })
  }

  const onOpenSearchHit = (hit: SearchHit): void => {
    options.openSearchHit(options.currentBaseId, hit)
  }

  return {
    onSelectBase,
    onCreate,
    onEdit,
    onImport: onImportDialog,
    onSearch,
    onDeleteBase,
    onOpenEntry,
    onDeleteEntry,
    onSavePrefs,
    onCreateBase,
    onEditBase,
    onDeleteCurrentBase,
    onPickImportSource,
    onSubmitImport,
    onClosePreview,
    onSavePreview,
    onLoadTablePage,
    onDeletePreview,
    onOpenSearchHit,
  }
}

function formatImportNotice(result: ImportResult): WorkbenchNotice {
  const summary = `导入完成：新增 ${result.copied.length}，跳过 ${result.skipped}`
  if (!result.failed) return { tone: 'success', text: summary }
  const details = result.files
    .filter((item) => item.status === 'failed')
    .slice(0, 2)
    .map((item) => `${item.sourceRelPath}：${item.reason ?? '处理失败'}`)
    .join('；')
  return {
    tone: result.copied.length > 0 || result.skipped > 0 ? 'warning' : 'error',
    text: `${summary}，失败 ${result.failed}${details ? `。${details}` : ''}`,
  }
}

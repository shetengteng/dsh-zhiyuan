import { createKbPreviewPanel } from './toolview/preview/KbPreviewPanel.tsx'
import { createKbSearchView } from './toolview/KbSearchView.tsx'
import { createPreviewController, type PreviewSelection } from './toolview/preview/preview-state.ts'
import { PACKAGE_NAME, SECTION_ID, SECTION_LABEL, SECTION_ORDER } from '../model/constants.ts'
import { createSettingsSection } from './settings/SettingsSection.tsx'
import { callKnowledgeHost, type KnowledgePrivateConnection } from './bridge.ts'
import { parseReadEntry } from './payload/read-entry.ts'
import { disposeSettingsStyles } from './settings/styles.ts'

export const name = PACKAGE_NAME
export const inject = ['slots', 'layout', 'connection']

type LayoutActions = {
  openDetails: () => void
  closeDetails: () => void
}

export function apply(ctx: {
  slots: {
    inject: (name: string, factory: () => unknown) => void
    register: (meta: Record<string, unknown>, component: unknown) => unknown
  }
  layout: LayoutActions
  effect?: (setup: () => (() => void) | void) => void
  connection?: KnowledgePrivateConnection
}): void {
  const loadPreview = async (selection: PreviewSelection, signal: AbortSignal) => {
    const value = await callKnowledgeHost(ctx.connection, {
      op: 'read',
      id: selection.baseId,
      path: selection.hit.path,
      view: 'search-hit',
      matchLine: selection.hit.matchLine,
      matchColumnByte: selection.hit.matchColumnByte,
      sourceFingerprint: selection.hit.sourceFingerprint,
    }, signal)
    return parseReadEntry(value, { view: 'search-hit', matchLine: selection.hit.matchLine })
  }
  const preview = createPreviewController(ctx.layout, loadPreview)
  const KbSearchView = createKbSearchView(preview, ctx.connection)
  const KbPreviewPanel = createKbPreviewPanel(preview)
  const SettingsSection = createSettingsSection(ctx.connection)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SECTION_ID,
    order: SECTION_ORDER,
    label: () => SECTION_LABEL,
    registrant: PACKAGE_NAME,
  }, SettingsSection))

  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'kb_search',
    registrant: PACKAGE_NAME,
  }, KbSearchView))

  ctx.slots.inject('details', () => ctx.slots.register({
    name: 'details',
    priority: -1,
    registrant: PACKAGE_NAME,
    inject: () => ({ closeDetails: () => ctx.layout.closeDetails() }),
  }, KbPreviewPanel))

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => {
      return () => {
        preview.dispose()
        disposeSettingsStyles()
      }
    })
  }
}

import { createKbPreviewPanel } from './toolview/preview/KbPreviewPanel.tsx'
import { createKbSearchView } from './toolview/KbSearchView.tsx'
import { createPreviewController, type PreviewLoader } from './toolview/preview/preview-state.ts'
import { createPreviewTabDefinition, PREVIEW_TAB_KIND, type PreviewTabDefinition } from './toolview/preview/preview-tab.ts'
import { FOOTER_ACTION_ID, FOOTER_ACTION_ORDER, PACKAGE_NAME, SECTION_LABEL } from '../model/package-info.ts'
import { createFooterAction } from './FooterAction.tsx'
import { callKnowledgeHost, type KnowledgePrivateConnection } from './bridge.ts'
import { parseReadEntry } from './payload/read-entry.ts'
import { disposeSettingsStyles } from './settings/styles.ts'

export const name = PACKAGE_NAME
export const inject = ['slots', 'connection', 'sidebarRight', 'sidebarRightTabs']

/** 右侧栏页类型的注册表；只用到注册这一个面。 */
type SidebarRightTabRegistry = {
  register: (definition: PreviewTabDefinition) => () => void
}

/** 右侧栏导航；页类型按 kind 打开，展开右栏由它自己负责。 */
type SidebarRightActions = {
  openTab: (kind: string, options: { params: unknown }) => void
}

export function apply(ctx: {
  slots: {
    inject: (name: string, factory: () => unknown) => void
    register: (meta: Record<string, unknown>, component: unknown) => unknown
  }
  sidebarRight: SidebarRightActions
  sidebarRightTabs: SidebarRightTabRegistry
  effect?: (setup: () => (() => void) | void) => void
  connection?: KnowledgePrivateConnection
}): void {
  const loadPreview: PreviewLoader = async (selection, signal) => {
    const value = await callKnowledgeHost(ctx.connection, {
      op: 'read',
      id: selection.kbId,
      path: selection.hit.path,
      view: 'search-hit',
      matchLine: selection.hit.matchLine,
      matchColumnByte: selection.hit.matchColumnByte,
      sourceFingerprint: selection.hit.sourceFingerprint,
    }, signal)
    return parseReadEntry(value)
  }
  const preview = createPreviewController((selection) => {
    ctx.sidebarRight.openTab(PREVIEW_TAB_KIND, { params: selection })
  })
  const KbSearchView = createKbSearchView(preview, ctx.connection)
  const KbPreviewPanel = createKbPreviewPanel(loadPreview, preview)
  const FooterAction = createFooterAction(ctx.connection)

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => ctx.sidebarRightTabs.register(createPreviewTabDefinition()))
  }

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: FOOTER_ACTION_ID,
    order: FOOTER_ACTION_ORDER,
    label: () => SECTION_LABEL,
    registrant: PACKAGE_NAME,
  }, FooterAction))

  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'kb_search',
    registrant: PACKAGE_NAME,
  }, KbSearchView))

  // 预览主体挂在页类型注册的 id 上，与 `sidebarRightTabs.register` 的 id 一致。
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: PACKAGE_NAME,
    registrant: PACKAGE_NAME,
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
import { createKbPreviewPanel } from './toolview/preview/KbPreviewPanel.tsx'
import { createKbSearchView } from './toolview/KbSearchView.tsx'
import { createPreviewController, type PreviewLoader } from './toolview/preview/preview-state.ts'
import { createPreviewTabDefinition, PREVIEW_TAB_KIND, type PreviewTabDefinition } from './toolview/preview/preview-tab.ts'
import { createCitationTail } from './citation/CitationTail.tsx'
import { createZhiyuanCitationsDefinition } from './citation/turn-citations.ts'
import { PACKAGE_NAME, PANEL_ID, PANEL_ORDER, SECTION_LABEL, TURN_TAIL_ID } from '../model/package-info.ts'
import { callKnowledgeHost, type KnowledgePrivateConnection } from './bridge.ts'
import { parseReadEntry } from './payload/read-entry.ts'
import { disposeSettingsStyles } from './settings/style-entry.ts'
import { createSettingsSection } from './settings/SettingsSection.tsx'
import { PanelIcon } from './settings/Icons.tsx'
import { installDragBeacon } from './drag-beacon.ts'

export const name = PACKAGE_NAME
export const inject = ['slots', 'connection', 'sidebarRight', 'sidebarRightTabs', 'uiConversation']

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
  uiConversation?: {
    events?: {
      register: (definition: unknown) => (() => void) | void
    }
  }
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
  const Workbench = createSettingsSection(ctx.connection)
  const CitationTail = createCitationTail(preview)

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => ctx.sidebarRightTabs.register(createPreviewTabDefinition()))
  }

  // 会话事件折叠：把 kb_search 的结果挂到轮次业务值上，引用条经 turn.data.get 读取。
  if (typeof ctx.effect === 'function' && typeof ctx.uiConversation?.events?.register === 'function') {
    ctx.effect(() => ctx.uiConversation?.events?.register(createZhiyuanCitationsDefinition()))
  }

  // 主侧栏全局面板行：图标即注册组件，点击后主区按 main 槽位的 key 装载工作台。
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: PANEL_ORDER,
    label: () => SECTION_LABEL,
    registrant: PACKAGE_NAME,
  }, PanelIcon))

  // 面板主区内容：key 必须与 panellist 条目 id 一致，selectPanel 按 id 装载。
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    registrant: PACKAGE_NAME,
  }, Workbench))

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

  // 答案下方的知源引用条：list 槽位里追加一个条目，不影响其他功能产物。
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    id: TURN_TAIL_ID,
    registrant: PACKAGE_NAME,
  }, CitationTail))

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => {
      // 临时拖拽诊断探针，定位 Safari 拖拽问题后随本行一并移除。
      const disposeDragBeacon = installDragBeacon()
      return () => {
        disposeDragBeacon()
        preview.dispose()
        disposeSettingsStyles()
      }
    })
  }
}
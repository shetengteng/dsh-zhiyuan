import { createSettingsSection } from './settings/Section.tsx'
import { KbSearchView } from './toolview/HitCard.tsx'
import { PACKAGE_NAME, SECTION_ID, SECTION_LABEL } from '../identity.ts'
import type { Remote, SessionsHandle, WorkspacesHandle } from './bridge.ts'

export const name = PACKAGE_NAME
export const inject = ['slots', 'remote', 'remote.commands', 'sessions', 'workspaces']

export function apply(ctx: {
  slots: {
    inject: (name: string, factory: () => unknown) => void
    register: (meta: Record<string, unknown>, component: unknown) => unknown
  }
  effect?: (setup: () => (() => void) | void) => void
  remote?: Remote
  sessions?: SessionsHandle
  workspaces?: WorkspacesHandle
}): void {
  console.log('[zhiyuan] client loaded')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SECTION_ID,
    order: 35,
    label: () => SECTION_LABEL,
    registrant: PACKAGE_NAME,
  }, createSettingsSection(ctx.remote, ctx.sessions, ctx.workspaces)))

  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'kb_search',
    registrant: PACKAGE_NAME,
  }, KbSearchView))

  ctx.effect?.(() => () => {
    console.log('[zhiyuan] client unloaded')
  })
}

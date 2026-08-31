import { createJobRunner } from './jobs.ts'
import { PACKAGE_NAME } from './identity.ts'
import { registerKbCommands } from './commands.ts'
import { registerKbTools } from './tools.ts'
import { registerZhiyuanPrompt, registerZhiyuanSkill } from './skill.ts'
import { resolveDataRoot } from './paths.ts'

export const name = PACKAGE_NAME

type HostCtx = {
  logger?: { info: (msg: string) => void }
  inject: (deps: string[], callback: (scoped: unknown) => void) => void
  effect?: (setup: () => (() => void) | void) => void
}

export function apply(ctx: HostCtx): void {
  const jobs = createJobRunner()
  console.log('[zhiyuan] host loaded')
  ctx.logger?.info('[zhiyuan] host loaded')

  ctx.inject(['commands'], (scoped) => {
    registerKbCommands(scoped as { commands: { register: (def: unknown) => () => void } }, jobs)
  })
  ctx.inject(['tools'], (scoped) => {
    registerKbTools(scoped as { tools: { register: (def: unknown) => () => void } }, jobs)
  })
  ctx.inject(['skills'], (scoped) => {
    registerZhiyuanSkill(scoped as { skills?: { register: (skill: unknown) => () => void } })
  })
  ctx.inject(['systemPrompt'], (scoped) => {
    registerZhiyuanPrompt(scoped as { systemPrompt?: { section: (section: unknown) => () => void } })
  })

  ctx.effect?.(() => {
    void resolveDataRoot().then((root) => ctx.logger?.info(`[zhiyuan] data root ${root}`))
    return () => {
      console.log('[zhiyuan] host unloaded')
    }
  })
}

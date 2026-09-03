import { createJobRunner } from './jobs.ts'
import { PACKAGE_NAME } from './identity.ts'
import { registerKbCommands } from './commands.ts'
import { registerKbTools } from './tools.ts'
import { registerZhiyuanPrompt, registerZhiyuanSkill } from './skill.ts'
import { clearDataRootCache, resolveDataRoot } from './paths.ts'
import { registerKnowledgePrivateRpc } from './private-rpc.ts'

export const name = PACKAGE_NAME

type HostCtx = {
  logger?: { info: (msg: string) => void }
  inject: (deps: string[], callback: (scoped: unknown) => void) => void
  effect?: (setup: () => (() => void) | void) => void
}

type Off = () => void

export function apply(ctx: HostCtx): void {
  const jobs = createJobRunner()
  const disposers: Off[] = []
  let alive = true
  const track = (off: Off | void) => {
    if (typeof off !== 'function') return
    if (!alive) {
      off()
      return
    }
    disposers.push(off)
  }

  console.log('[zhiyuan] host loaded')
  ctx.logger?.info('[zhiyuan] host loaded')

  ctx.inject(['commands'], (scoped) => {
    track(registerKbCommands(scoped as { commands: { register: (def: unknown) => () => void } }, jobs))
  })
  ctx.inject(['connection'], (scoped) => {
    void registerKnowledgePrivateRpc(scoped as Parameters<typeof registerKnowledgePrivateRpc>[0], jobs)
  })
  ctx.inject(['tools'], (scoped) => {
    track(registerKbTools(scoped as { tools: { register: (def: unknown) => () => void } }, jobs))
  })
  ctx.inject(['skills'], (scoped) => {
    track(registerZhiyuanSkill(scoped as { skills?: { register: (skill: unknown) => () => void } }))
  })
  ctx.inject(['systemPrompt'], (scoped) => {
    track(registerZhiyuanPrompt(scoped as { systemPrompt?: { section: (section: unknown) => () => void } }))
  })

  ctx.effect?.(() => {
    void resolveDataRoot().then((root) => ctx.logger?.info(`[zhiyuan] data root ${root}`))
    return () => {
      alive = false
      for (const off of disposers.splice(0).reverse()) off()
      clearDataRootCache()
      console.log('[zhiyuan] host unloaded')
    }
  })
}

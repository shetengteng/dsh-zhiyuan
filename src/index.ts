import { registerKbCommands } from './controller/command/index.ts'
import { registerKnowledgePrivateRpc } from './controller/rpc/index.ts'
import { registerKbTools } from './controller/tool/index.ts'
import { PACKAGE_NAME } from './model/constants.ts'
import { createJobRunner } from './platform/jobs.ts'
import { clearDataRootCache, resolveDataRoot } from './platform/paths.ts'
import { FileCatalogRepository } from './repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from './service/kb/knowledge-services.ts'
import { registerZhiyuanPrompt, registerZhiyuanSkill } from './skills/skill.ts'

export const name = PACKAGE_NAME

type HostCtx = {
  logger?: { info: (msg: string) => void; warn?: (msg: string) => void }
  inject: (deps: string[], callback: (scoped: unknown) => void) => void
  effect?: (setup: () => (() => void) | void) => void
}

type Off = () => void

type AsyncOff = () => Promise<void>

export function apply(ctx: HostCtx): void {
  const jobs = createJobRunner()
  const catalogRepository = new FileCatalogRepository({
    onWarning: (message) => ctx.logger?.warn?.(`[zhiyuan] ${message}`),
  })
  const knowledgeServices = createKnowledgeServices(catalogRepository)
  const disposers: Off[] = []
  let alive = true
  const reportCleanupError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger?.warn?.(`[zhiyuan] cleanup failed: ${message}`)
  }
  const track = (off: Off | void): void => {
    if (typeof off !== 'function') return
    if (!alive) {
      off()
      return
    }
    disposers.push(off)
  }
  const trackAsync = (off: AsyncOff | void): void => {
    if (typeof off !== 'function') return
    const dispose = (): void => {
      void Promise.resolve().then(off).catch(reportCleanupError)
    }
    if (!alive) {
      dispose()
      return
    }
    disposers.push(dispose)
  }

  ctx.logger?.info('[zhiyuan] host loaded')

  ctx.inject(['commands'], (scoped) => {
    track(registerKbCommands(scoped as { commands: { register: (def: unknown) => () => void } }, jobs, knowledgeServices))
  })
  ctx.inject(['connection'], (scoped) => {
    trackAsync(registerKnowledgePrivateRpc(scoped as Parameters<typeof registerKnowledgePrivateRpc>[0], jobs, knowledgeServices))
  })
  ctx.inject(['tools'], (scoped) => {
    track(registerKbTools(scoped as { tools: { register: (def: unknown) => () => void } }, jobs, knowledgeServices))
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
    }
  })
}

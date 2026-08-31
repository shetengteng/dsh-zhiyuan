import { COMMAND_NAME } from './identity.ts'
import { createBase, deleteBase, deleteEntry, listBases, listTree, readEntry, updateBase, writeEntry } from './bases.ts'
import { lastDestCategory, readCatalog, writeCatalog } from './catalog.ts'
import { ingest } from './ingest.ts'
import type { JobRunner } from './jobs.ts'
import { resolveDataRoot } from './paths.ts'
import { searchBase } from './search.ts'
import { flagBool, flagString, parseFlags, splitAliases, tokenize } from './command-parse.ts'
import { KbError } from './types.ts'

type CommandResult = { kind: 'success'; text?: string } | { kind: 'error'; text: string }

function ok(value: unknown): CommandResult {
  return { kind: 'success', text: typeof value === 'string' ? value : JSON.stringify(value) }
}

function fail(error: unknown): CommandResult {
  return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
}

async function handleCall(payload: string, jobs: JobRunner): Promise<unknown> {
  const data = JSON.parse(payload) as Record<string, unknown>
  const op = String(data.op ?? '')
  const root = await resolveDataRoot()
  switch (op) {
    case 'list':
      return listBases(root)
    case 'create':
      return createBase(root, {
        id: String(data.id ?? ''),
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [],
      })
    case 'update':
      return updateBase(root, String(data.id ?? ''), {
        title: data.title as string | undefined,
        description: data.description as string | undefined,
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : undefined,
      })
    case 'deleteBase':
      await deleteBase(root, String(data.id ?? ''), Boolean(data.confirm))
      return { ok: true }
    case 'tree':
      return listTree(root, String(data.id ?? ''))
    case 'read':
      return readEntry(root, String(data.id ?? ''), String(data.path ?? ''))
    case 'write':
      await writeEntry(root, String(data.id ?? ''), String(data.path ?? ''), String(data.text ?? ''))
      return { ok: true }
    case 'deleteEntry':
      await deleteEntry(root, String(data.id ?? ''), String(data.path ?? ''), Boolean(data.confirm))
      return { ok: true }
    case 'ingest':
      return jobs.enqueue('ingest', () => ingest(root, {
        baseId: String(data.baseId ?? ''),
        sourcePath: String(data.sourcePath ?? ''),
        destCategory: String(data.destCategory ?? ''),
        preserveTree: Boolean(data.preserveTree),
        createMissing: data.createMissing !== false,
      }))
    case 'search':
      return searchBase(root, {
        baseId: String(data.baseId ?? ''),
        query: String(data.query ?? ''),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : undefined,
        category: typeof data.category === 'string' ? data.category : undefined,
        topK: typeof data.topK === 'number' ? data.topK : undefined,
      })
    case 'prefs':
      return (await readCatalog(root)).prefs
    case 'setPrefs': {
      const catalog = await readCatalog(root)
      if (typeof data.defaultBaseId === 'string') catalog.prefs.defaultBaseId = data.defaultBaseId
      if (typeof data.maxFileBytes === 'number') catalog.prefs.maxFileBytes = data.maxFileBytes
      if (typeof data.maxBaseBytes === 'number') catalog.prefs.maxBaseBytes = data.maxBaseBytes
      await writeCatalog(root, catalog)
      return catalog.prefs
    }
    default:
      throw new KbError('missing_field', `未知操作 ${op}`)
  }
}

export async function resolveIngestTo(
  dataRoot: string,
  baseId: string,
  destFlag: string | undefined,
  toRoot: boolean,
): Promise<string> {
  if (destFlag !== undefined) return destFlag
  if (toRoot) return ''
  const last = await lastDestCategory(dataRoot, baseId)
  if (last === undefined) {
    throw new KbError('missing_field', '请指定 --to <类目>，或 --root 导入到库根')
  }
  return last
}

async function handleIngest(rest: string[], flags: ReturnType<typeof parseFlags>['flags'], jobs: JobRunner) {
  const path = rest[0] ?? flagString(flags, 'path')
  const baseId = flagString(flags, 'base')
  if (!path) throw new KbError('missing_field', '用法：/kb ingest <path> --base <id> --to <类目>')
  if (!baseId) throw new KbError('missing_field', '导入必须指定 --base')
  const root = await resolveDataRoot()
  const destCategory = await resolveIngestTo(root, baseId, flagString(flags, 'to'), flagBool(flags, 'root', false))
  return jobs.enqueue('ingest', () => ingest(root, {
    baseId,
    sourcePath: path,
    destCategory,
    preserveTree: flagBool(flags, 'preserve-tree'),
    createMissing: !flagBool(flags, 'no-create'),
  }))
}

export function registerKbCommands(
  ctx: { commands: { register: (def: unknown) => () => void } },
  jobs: JobRunner,
): () => void {
  return ctx.commands.register({
    name: COMMAND_NAME,
    description: '知源知识库：ingest / status / call',
    input: { hint: 'ingest <path> --base <id> --to <类目> | status | call {json}' },
    recordInput: false,
    handler: async ({ rawInput }: { rawInput: string }) => {
      const tokens = tokenize(rawInput.trim())
      const parsed = parseFlags(tokens)
      try {
        if (parsed.sub === 'status' || !parsed.sub) return ok(jobs.status())
        if (parsed.sub === 'ingest') return ok(await handleIngest(parsed.rest, parsed.flags, jobs))
        if (parsed.sub === 'call') return ok(await handleCall(parsed.rest.join(' '), jobs))
        if (parsed.sub === 'search') {
          const root = await resolveDataRoot()
          return ok(await searchBase(root, {
            baseId: flagString(parsed.flags, 'base') ?? '',
            query: parsed.rest.join(' ') || flagString(parsed.flags, 'query') || '',
            aliases: splitAliases(flagString(parsed.flags, 'aliases')),
            category: flagString(parsed.flags, 'to') ?? flagString(parsed.flags, 'category'),
          }))
        }
        return { kind: 'error', text: '用法：/kb ingest <path> --base <id> --to <类目> 或 /kb status' }
      } catch (error) {
        return fail(error)
      }
    },
  }) ?? (() => undefined)
}

import { COMMAND_NAME } from './identity.ts'
import { createBase, deleteBase, deleteEntry, listBases, listTree, readEntry, updateBase, writeEntry } from './bases.ts'
import { lastDestCategory, readCatalog, writeCatalog } from './catalog.ts'
import { ingest } from './ingest.ts'
import type { JobRunner } from './jobs.ts'
import { resolveDataRoot } from './paths.ts'
import { pickSource } from './pick-source.ts'
import { searchBase } from './search.ts'
import { flagBool, flagString, parseFlags, splitAliases, tokenize } from './command-parse.ts'
import { EntryPreviewView, isEntryPreviewView, type EntryPreviewOptions } from './content/host-api.ts'
import { KbError } from './types.ts'

type CommandResult = { kind: 'success'; text?: string } | { kind: 'error'; text: string }

function ok(value: unknown): CommandResult {
  return { kind: 'success', text: typeof value === 'string' ? value : JSON.stringify(value) }
}

function fail(error: unknown): CommandResult {
  return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function readPreviewOptions(data: Record<string, unknown>): EntryPreviewOptions {
  if (data.view === undefined) return {}
  if (!isEntryPreviewView(data.view)) {
    throw new KbError('invalid_preview', '预览模式无效')
  }
  const view = data.view
  if (view === EntryPreviewView.Tree) return { view }
  if (!positiveInteger(data.matchLine)) throw new KbError('invalid_preview', '搜索预览缺少有效命中行')
  if (data.matchColumnByte !== undefined && !positiveInteger(data.matchColumnByte)) {
    throw new KbError('invalid_preview', '搜索预览命中列无效')
  }
  if (data.sourceFingerprint !== undefined && (typeof data.sourceFingerprint !== 'string' || data.sourceFingerprint.length > 128)) {
    throw new KbError('invalid_preview', '搜索预览文件指纹无效')
  }
  return {
    view,
    matchLine: data.matchLine,
    matchColumnByte: data.matchColumnByte as number | undefined,
    sourceFingerprint: data.sourceFingerprint as string | undefined,
  }
}

async function handleCall(payload: string, jobs: JobRunner): Promise<unknown> {
  const data = JSON.parse(payload) as Record<string, unknown>
  const op = String(data.op ?? '')
  const dataRoot = await resolveDataRoot()
  switch (op) {
    case 'list':
      return listBases(dataRoot)
    case 'create':
      return createBase(dataRoot, {
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [],
      })
    case 'update':
      return updateBase(dataRoot, String(data.id ?? ''), {
        title: data.title as string | undefined,
        description: data.description as string | undefined,
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : undefined,
      })
    case 'deleteBase':
      await deleteBase(dataRoot, String(data.id ?? ''), Boolean(data.confirm))
      return { ok: true }
    case 'tree':
      return listTree(dataRoot, String(data.id ?? ''))
    case 'read':
      return readEntry(dataRoot, String(data.id ?? ''), String(data.path ?? ''), readPreviewOptions(data))
    case 'write':
      await writeEntry(dataRoot, String(data.id ?? ''), String(data.path ?? ''), String(data.text ?? ''))
      return { ok: true }
    case 'deleteEntry':
      await deleteEntry(dataRoot, String(data.id ?? ''), String(data.path ?? ''), Boolean(data.confirm))
      return { ok: true }
    case 'pick':
      return pickSource(data.kind === 'dir' ? 'dir' : 'file')
    case 'ingest':
      return jobs.enqueue('ingest', () => ingest(dataRoot, {
        baseId: String(data.baseId ?? ''),
        sourcePath: String(data.sourcePath ?? ''),
        destCategory: String(data.destCategory ?? ''),
        preserveTree: Boolean(data.preserveTree),
        createMissing: data.createMissing !== false,
      }))
    case 'search':
      return searchBase(dataRoot, {
        baseId: String(data.baseId ?? ''),
        query: String(data.query ?? ''),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : undefined,
        category: typeof data.category === 'string' ? data.category : undefined,
        topK: typeof data.topK === 'number' ? data.topK : undefined,
      })
    case 'prefs':
      return (await readCatalog(dataRoot)).prefs
    case 'setPrefs': {
      const catalog = await readCatalog(dataRoot)
      if (typeof data.defaultBaseId === 'string') catalog.prefs.defaultBaseId = data.defaultBaseId
      if (typeof data.maxFileBytes === 'number') catalog.prefs.maxFileBytes = data.maxFileBytes
      if (typeof data.maxBaseBytes === 'number') catalog.prefs.maxBaseBytes = data.maxBaseBytes
      await writeCatalog(dataRoot, catalog)
      return catalog.prefs
    }
    default:
      throw new KbError('missing_field', `未知操作 ${op}`)
  }
}

export async function resolveIngestTo(
  dataRoot: string,
  baseId: string,
  destinationCategoryFlag: string | undefined,
  importToBaseRoot: boolean,
): Promise<string> {
  if (destinationCategoryFlag !== undefined) return destinationCategoryFlag
  if (importToBaseRoot) return ''
  const lastDestinationCategory = await lastDestCategory(dataRoot, baseId)
  if (lastDestinationCategory === undefined) {
    throw new KbError('missing_field', '请指定 --to <类目>，或 --root 导入到库根')
  }
  return lastDestinationCategory
}

async function handleIngest(rest: string[], flags: ReturnType<typeof parseFlags>['flags'], jobs: JobRunner) {
  const sourcePath = rest[0] ?? flagString(flags, 'path')
  const baseId = flagString(flags, 'base')
  if (!sourcePath) throw new KbError('missing_field', '用法：/kb ingest <path> --base <id> --to <类目>')
  if (!baseId) throw new KbError('missing_field', '导入必须指定 --base')
  const dataRoot = await resolveDataRoot()
  const destCategory = await resolveIngestTo(dataRoot, baseId, flagString(flags, 'to'), flagBool(flags, 'root', false))
  return jobs.enqueue('ingest', () => ingest(dataRoot, {
    baseId,
    sourcePath,
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
          const dataRoot = await resolveDataRoot()
          return ok(await searchBase(dataRoot, {
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

import { COMMAND_NAME } from './identity.ts'
import { lastDestCategory } from './catalog.ts'
import { ingest, buildIngestInput } from './ingest.ts'
import type { JobRunner } from './jobs.ts'
import { resolveDataRoot } from './paths.ts'
import { searchBase } from './search.ts'
import { flagBool, flagString, parseFlags, splitAliases, tokenize } from './command-parse.ts'
import { KbError } from './types.ts'
import { executeKnowledgeOperation } from './ui-operations.ts'

type CommandResult = { kind: 'success'; text?: string } | { kind: 'error'; text: string }

function ok(value: unknown): CommandResult {
  return { kind: 'success', text: typeof value === 'string' ? value : JSON.stringify(value) }
}

function fail(error: unknown): CommandResult {
  return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
}

async function handleCall(payload: string, jobs: JobRunner): Promise<unknown> {
  return executeKnowledgeOperation(JSON.parse(payload) as unknown, jobs)
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
  return jobs.enqueue('ingest', () => ingest(dataRoot, buildIngestInput({
    baseId,
    sourcePath,
    destCategory,
    preserveTree: flagBool(flags, 'preserve-tree'),
    createMissing: !flagBool(flags, 'no-create'),
  })))
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

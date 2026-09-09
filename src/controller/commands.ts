import { COMMAND_NAME } from '../model/constants.ts'
import { lastDestCategory } from '../service/kb/catalog.ts'
import { importFiles, buildImportInput } from '../service/kb/import.ts'
import type { JobRunner } from '../platform/jobs.ts'
import { resolveDataRoot } from '../platform/paths.ts'
import type { SearchRequest } from '../service/search/index.ts'
import { searchKnowledgeBase } from './search-operation.ts'
import { flagBool, flagString, parseFlags, splitAliases, tokenize } from './command-parse.ts'
import { KbError } from '../model/types.ts'
import { executeKnowledgeOperation } from './rpc-dispatch.ts'

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

export async function resolveImportTo(
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

function searchLimit(flags: ReturnType<typeof parseFlags>['flags']): number | undefined {
  const value = flagString(flags, 'limit')
  if (value === undefined) return undefined
  const limit = Number(value)
  if (!Number.isSafeInteger(limit)) throw new KbError('invalid_field', 'limit 必须是整数')
  return limit
}

function buildSearchRequest(rest: string[], flags: ReturnType<typeof parseFlags>['flags']): SearchRequest {
  const limit = searchLimit(flags)
  const cursor = flagString(flags, 'cursor')
  if (cursor) return { cursor, ...(limit === undefined ? {} : { limit }) }
  return {
    baseId: flagString(flags, 'base') ?? '',
    query: rest.join(' ') || flagString(flags, 'query') || '',
    aliases: splitAliases(flagString(flags, 'aliases')),
    category: flagString(flags, 'to') ?? flagString(flags, 'category'),
    path: flagString(flags, 'path'),
    ...(limit === undefined ? {} : { limit }),
  }
}

async function handleImport(rest: string[], flags: ReturnType<typeof parseFlags>['flags'], jobs: JobRunner) {
  const sourcePath = rest[0] ?? flagString(flags, 'path')
  const baseId = flagString(flags, 'base')
  if (!sourcePath) throw new KbError('missing_field', '用法：/kb import <path> --base <id> --to <类目>')
  if (!baseId) throw new KbError('missing_field', '导入必须指定 --base')
  const dataRoot = await resolveDataRoot()
  const destCategory = await resolveImportTo(dataRoot, baseId, flagString(flags, 'to'), flagBool(flags, 'root', false))
  return jobs.enqueue('import', () => importFiles(dataRoot, buildImportInput({
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
    description: '知源知识库：import / status / call',
    input: { hint: 'import <path> --base <id> --to <类目> | status | call {json}' },
    recordInput: false,
    handler: async ({ rawInput }: { rawInput: string }) => {
      const tokens = tokenize(rawInput.trim())
      const parsed = parseFlags(tokens)
      try {
        if (parsed.sub === 'status' || !parsed.sub) return ok(jobs.status())
        if (parsed.sub === 'import') return ok(await handleImport(parsed.rest, parsed.flags, jobs))
        if (parsed.sub === 'call') return ok(await handleCall(parsed.rest.join(' '), jobs))
        if (parsed.sub === 'search') {
          const dataRoot = await resolveDataRoot()
          return ok(await searchKnowledgeBase(dataRoot, buildSearchRequest(parsed.rest, parsed.flags)))
        }
        return { kind: 'error', text: '用法：/kb import <path> --base <id> --to <类目> 或 /kb status' }
      } catch (error) {
        return fail(error)
      }
    },
  }) ?? (() => undefined)
}

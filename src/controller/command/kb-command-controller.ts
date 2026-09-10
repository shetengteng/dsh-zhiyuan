import { COMMAND_NAME } from '../../model/constants.ts'
import { KbError } from '../../model/error/kb-error.ts'
import { createImportFromPathRequest } from '../../model/request/import-request.ts'
import type { SearchRequest } from '../../model/request/search-request.ts'
import type { JobRunner } from '../../platform/jobs.ts'
import { resolveDataRoot } from '../../platform/paths.ts'
import type { KnowledgeServices } from '../../service/kb/knowledge-services.ts'
import { executeKnowledgeOperation } from '../rpc/knowledge-operation-controller.ts'
import { flagBool, flagString, parseFlags, splitAliases, tokenize } from './kb-command-parser.ts'

type CommandResult = { kind: 'success'; text?: string } | { kind: 'error'; text: string }

function ok(value: unknown): CommandResult {
  return { kind: 'success', text: typeof value === 'string' ? value : JSON.stringify(value) }
}

function fail(error: unknown): CommandResult {
  return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
}

async function handleCall(payload: string, jobs: JobRunner, knowledgeServices: KnowledgeServices): Promise<unknown> {
  return executeKnowledgeOperation(JSON.parse(payload) as unknown, jobs, knowledgeServices)
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
  if (cursor) {
    if (rest.length || ['kb', 'query', 'aliases', 'to', 'category', 'path'].some((key) => flags[key] !== undefined)) {
      throw new KbError('invalid_field', '续页请求只能包含 cursor 和 limit')
    }
    return { cursor, ...(limit === undefined ? {} : { limit }) }
  }
  return {
    kbId: flagString(flags, 'kb') ?? '',
    query: rest.join(' ') || flagString(flags, 'query') || '',
    aliases: splitAliases(flagString(flags, 'aliases')),
    category: flagString(flags, 'to') ?? flagString(flags, 'category'),
    path: flagString(flags, 'path'),
    ...(limit === undefined ? {} : { limit }),
  }
}

async function handleImport(
  rest: string[],
  flags: ReturnType<typeof parseFlags>['flags'],
  jobs: JobRunner,
  knowledgeServices: KnowledgeServices,
): Promise<unknown> {
  const sourcePath = rest[0] ?? flagString(flags, 'path')
  const kbId = flagString(flags, 'kb')
  if (!sourcePath) throw new KbError('missing_field', '用法：/kb import <path> --kb <id> --to <类目>')
  if (!kbId) throw new KbError('missing_field', '导入必须指定 --kb')
  const dataRoot = await resolveDataRoot()
  const destCategory = await knowledgeServices.resolveImportTo(dataRoot, kbId, flagString(flags, 'to'), flagBool(flags, 'root', false))
  return jobs.enqueue('import', () => knowledgeServices.importFiles(dataRoot, createImportFromPathRequest({
    kbId,
    sourcePath,
    destCategory,
    preserveTree: flagBool(flags, 'preserve-tree'),
    createMissing: !flagBool(flags, 'no-create'),
  })))
}

export function registerKbCommands(
  ctx: { commands: { register: (def: unknown) => () => void } },
  jobs: JobRunner,
  knowledgeServices: KnowledgeServices,
): () => void {
  return ctx.commands.register({
    name: COMMAND_NAME,
    description: '知源知识库：import / status / call',
    input: { hint: 'import <path> --kb <id> --to <类目> | status | call {json}' },
    recordInput: false,
    handler: async ({ rawInput }: { rawInput: string }) => {
      const tokens = tokenize(rawInput.trim())
      const parsed = parseFlags(tokens)
      try {
        if (parsed.sub === 'status' || !parsed.sub) return ok(jobs.status())
        if (parsed.sub === 'import') return ok(await handleImport(parsed.rest, parsed.flags, jobs, knowledgeServices))
        if (parsed.sub === 'call') return ok(await handleCall(parsed.rest.join(' '), jobs, knowledgeServices))
        if (parsed.sub === 'search') {
          const dataRoot = await resolveDataRoot()
          return ok(await knowledgeServices.searchKb(dataRoot, buildSearchRequest(parsed.rest, parsed.flags)))
        }
        return { kind: 'error', text: '用法：/kb import <path> --kb <id> --to <类目> 或 /kb status' }
      } catch (error) {
        return fail(error)
      }
    },
  }) ?? (() => undefined)
}

import { ingest } from './ingest.ts'
import { createJobRunner, type JobRunner } from './jobs.ts'
import { listBases } from './bases.ts'
import { resolveDataRoot } from './paths.ts'
import { searchBase } from './search.ts'
import { KbError } from './types.ts'

type Json = Record<string, unknown>

type ToolCtx = {
  tools: { register: (def: unknown) => () => void }
}

function asRecord(args: unknown): Json {
  return args && typeof args === 'object' && !Array.isArray(args) ? args as Json : {}
}

function requireString(args: Json, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !value.trim()) throw new KbError('missing_field', `${key} 必填`)
  return value
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is string => typeof item === 'string')
}

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

function fail(error: unknown): never {
  if (error instanceof KbError) throw new Error(error.message)
  throw error
}

export function registerKbTools(ctx: ToolCtx, jobs: JobRunner = createJobRunner()): () => void {
  const offs = [
    ctx.tools.register({
    name: 'kb_list_bases',
    description: '列出已创建的知识库卡片：id、标题、描述、别名、类目名、约多少篇。不含文件名和正文。选库时先调用本工具。',
    parameters: { type: 'object' },
    output: {
      schema: { type: 'object', properties: { bases: { type: 'array' } } },
      render: (_args: unknown, value: unknown) => {
        const bases = (value as { bases?: Array<{ id: string; title: string }> })?.bases ?? []
        return text(bases.map((item) => `${item.id} ${item.title}`).join(' · ') || '还没有知识库')
      },
    },
    isConcurrencySafe: () => true,
    execute: async () => {
      try {
        const dataRoot = await resolveDataRoot()
        return { bases: await listBases(dataRoot) }
      } catch (error) {
        fail(error)
      }
    },
  }),
    ctx.tools.register({
    name: 'kb_ingest',
    description: '把本机 md/txt 拷进已有知识库的指定类目。库必须已存在。不要猜测新库。destCategory 为空表示库根。',
    parameters: {
      type: 'object',
      required: ['baseId', 'sourcePath'],
      properties: {
        baseId: { type: 'string', description: '已存在的知识库 id' },
        sourcePath: { type: 'string', description: '本机文件或文件夹路径，只读源' },
        destCategory: { type: 'string', description: '库内相对类目，如 合同/2024；空=库根' },
        preserveTree: { type: 'boolean', description: '源是文件夹时是否保留相对子目录，默认 false' },
        createMissing: { type: 'boolean', description: '类目不存在则创建，默认 true。不建新库' },
        onConflict: { type: 'string', enum: ['skip'], description: '默认 skip。同指纹跳过；同名不同内容改名，不覆盖' },
      },
    },
    output: {
      schema: { type: 'object' },
      render: (_args: unknown, value: unknown) => {
        const r = value as { copied?: string[]; skipped?: number; failed?: number }
        return text(`导入 ${r.copied?.length ?? 0} · 跳过 ${r.skipped ?? 0} · 失败 ${r.failed ?? 0}`)
      },
    },
    execute: async (args: unknown) => {
      const rec = asRecord(args)
      try {
        const dataRoot = await resolveDataRoot()
        return await jobs.enqueue('ingest', () => ingest(dataRoot, {
          baseId: requireString(rec, 'baseId'),
          sourcePath: requireString(rec, 'sourcePath'),
          destCategory: asString(rec.destCategory) ?? '',
          preserveTree: asBool(rec.preserveTree, false),
          createMissing: asBool(rec.createMissing, true),
          onConflict: 'skip',
        }))
      } catch (error) {
        fail(error)
      }
    },
  }),
    ctx.tools.register({
    name: 'kb_search',
    description: '在指定知识库里一次多词 grep。必须带 baseId。换词放进 aliases（3～8）。没命中返回空列表，不要编造。',
    parameters: {
      type: 'object',
      required: ['baseId', 'query'],
      properties: {
        baseId: { type: 'string', description: '必填。禁止省略后扫全部库' },
        query: { type: 'string', description: '主关键词' },
        aliases: { type: 'array', items: { type: 'string' }, description: '3～8 个同义词，与 query 合并一次 OR' },
        category: { type: 'string', description: '对上子文件夹则只扫那一层；对不上则本库全扫' },
        topK: { type: 'number', description: '默认 12，上限 20' },
      },
    },
    output: {
      schema: { type: 'object', properties: { hits: { type: 'array' }, warnings: { type: 'array' } } },
      render: (_args: unknown, value: unknown) => {
        const hits = (value as { hits?: Array<{ n: number; path: string }> })?.hits ?? []
        return text(hits.length ? hits.map((hit) => `[${hit.n}] ${hit.path}`).join('\n') : '无命中')
      },
      presentationMeta: (_args: unknown, value: unknown) => value as Json,
    },
    presentCall: () => ({ card: 'generic', title: '知识库检索' }),
    presentResult: (_args: unknown, result: { isError: boolean }) => (
      result.isError ? { card: 'generic', title: '检索失败' } : { card: 'generic', title: '知识库命中' }
    ),
    execute: async (args: unknown) => {
      const rec = asRecord(args)
      if (typeof rec.baseId !== 'string' || !rec.baseId.trim()) {
        throw new Error('kb_search 必须带 baseId')
      }
      try {
        const dataRoot = await resolveDataRoot()
        return await searchBase(dataRoot, {
          baseId: rec.baseId,
          query: requireString(rec, 'query'),
          aliases: asStringArray(rec.aliases),
          category: asString(rec.category),
          topK: typeof rec.topK === 'number' ? rec.topK : undefined,
        })
      } catch (error) {
        fail(error)
      }
    },
  }),
  ]
  return () => {
    for (const off of offs.reverse()) {
      if (typeof off === 'function') off()
    }
  }
}

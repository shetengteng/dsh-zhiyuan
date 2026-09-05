import { buildIngestInput, ingest } from './ingest.ts'
import { createJobRunner, type JobRunner } from './jobs.ts'
import { listBases } from './bases.ts'
import { resolveDataRoot } from './paths.ts'
import { renderIngestResult, renderSearchResult } from './render-search.ts'
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
        return [{ type: 'text' as const, text: bases.map((item) => `${item.id} ${item.title}`).join(' · ') || '还没有知识库' }]
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
    description: '把本机 md/txt/csv 导入已有知识库的指定类目。CSV 会转成 UTF-8 后入库，可在知源中表格编辑。库必须已存在。不要猜测新库。destCategory 为空表示库根。',
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
      schema: {
        type: 'object',
        properties: {
          copied: { type: 'array', items: { type: 'string' } },
          renamed: { type: 'array', items: { type: 'string' } },
          skipped: { type: 'integer' },
          failed: { type: 'integer' },
          files: { type: 'array' },
          warnings: { type: 'array', items: { type: 'string' } },
        },
      },
      render: (_args: unknown, value: unknown) => renderIngestResult(value),
    },
    execute: async (args: unknown) => {
      const input = asRecord(args)
      try {
        const dataRoot = await resolveDataRoot()
        return await jobs.enqueue('ingest', () => ingest(dataRoot, buildIngestInput({
          baseId: requireString(input, 'baseId'),
          sourcePath: requireString(input, 'sourcePath'),
          destCategory: asString(input.destCategory) ?? '',
          preserveTree: asBool(input.preserveTree, false),
          createMissing: asBool(input.createMissing, true),
        })))
      } catch (error) {
        fail(error)
      }
    },
  }),
    ctx.tools.register({
    name: 'kb_search',
    description: '在指定知识库里一次多词 grep，结果按文件分组返回：每页不跨文件，先给命中概览（文件数、命中数、未展示清单），每条命中带原文 excerpt、路径和物理行号；CSV 命中 excerpt 带列名，表头在组头只出现一次。必须带 baseId。换词放进 aliases（3～8）。结果按字符预算分页，scanComplete=false 或 hasMore=true 时不能把当前页当成全量；需深读某个文件的全部命中时传 path（来自命中路径或未展示清单）。',
    parameters: {
      type: 'object',
      required: ['baseId', 'query'],
      properties: {
        baseId: { type: 'string', description: '必填。禁止省略后扫全部库' },
        query: { type: 'string', description: '主关键词' },
        aliases: { type: 'array', items: { type: 'string' }, description: '3～8 个同义词，与 query 合并一次 OR' },
        category: { type: 'string', description: '对上子文件夹则只扫那一层；对不上则本库全扫' },
        path: { type: 'string', description: '明细档：只返回该文件的命中（类目内相对路径），excerpt 带更宽上下文' },
        cursor: { type: 'string', description: '上一页返回的 nextCursor；只用于继续同一查询' },
      },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: '本页文件组，一页不跨文件',
            items: {
              type: 'object',
              required: ['path', 'format', 'totalHits', 'hits'],
              properties: {
                path: { type: 'string' },
                format: { type: 'string', description: 'markdown 或 csv' },
                totalHits: { type: 'integer', description: '该文件 rg 原始命中数' },
                groupHeader: { type: 'string', description: 'CSV 表头行，组内只渲染一次' },
                hits: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['n', 'path', 'startLine', 'endLine', 'matchLine', 'excerpt'],
                    properties: {
                      n: { type: 'integer', description: '跨页连续的全局命中编号' },
                      path: { type: 'string' },
                      startLine: { type: 'integer' },
                      endLine: { type: 'integer' },
                      matchLine: { type: 'integer' },
                      excerpt: { type: 'string' },
                      matchedExcerpt: { type: 'string', description: '命中行展示文本，由格式模块给出' },
                      matchColumnByte: { type: 'integer', description: 'UI 预览使用的 UTF-8 字节列' },
                      sourceFingerprint: { type: 'string', description: 'UI 预览用的源文件指纹' },
                    },
                  },
                },
              },
            },
          },
          totalFiles: { type: 'integer', description: '命中文件总数' },
          totalHits: { type: 'integer', description: '命中总数；scanComplete=false 时为下限' },
          restFiles: { type: 'array', description: '本页未展示的文件与命中数', items: { type: 'object', properties: { path: { type: 'string' }, count: { type: 'integer' } } } },
          warnings: { type: 'array', items: { type: 'string' } },
          scanComplete: { type: 'boolean', description: '是否完成了本次可搜索范围的扫描' },
          hasMore: { type: 'boolean', description: '当前页之后是否还有已发现的命中' },
          nextCursor: { type: 'string', description: '继续下一页的游标' },
        },
        required: ['files', 'totalFiles', 'totalHits', 'warnings', 'scanComplete', 'hasMore'],
      },
      render: (args: unknown, value: unknown) => renderSearchResult(args, value),
      presentationMeta: (args: unknown, value: unknown) => {
        const baseId = asString(asRecord(args)?.baseId)?.trim()
        const result = asRecord(value)
        if (!result) return value as Json
        const safeResult: Json = {
          files: Array.isArray(result.files) ? result.files : [],
          totalFiles: typeof result.totalFiles === 'number' ? result.totalFiles : 0,
          totalHits: typeof result.totalHits === 'number' ? result.totalHits : 0,
          warnings: Array.isArray(result.warnings) ? result.warnings : [],
        }
        if (Array.isArray(result.restFiles)) safeResult.restFiles = result.restFiles
        if (typeof result.scanComplete === 'boolean') safeResult.scanComplete = result.scanComplete
        if (typeof result.hasMore === 'boolean') safeResult.hasMore = result.hasMore
        if (typeof result.nextCursor === 'string') safeResult.nextCursor = result.nextCursor
        if (baseId) safeResult.baseId = baseId
        return safeResult
      },
    },
    presentCall: () => ({ card: 'generic', title: '知识库检索' }),
    presentResult: (_args: unknown, result: { isError: boolean }) => (
      result.isError ? { card: 'generic', title: '检索失败' } : { card: 'generic', title: '知识库命中' }
    ),
    execute: async (args: unknown) => {
      const input = asRecord(args)
      if (typeof input.baseId !== 'string' || !input.baseId.trim()) {
        throw new Error('kb_search 必须带 baseId')
      }
      try {
        const dataRoot = await resolveDataRoot()
        return await searchBase(dataRoot, {
          baseId: input.baseId,
          query: requireString(input, 'query'),
          aliases: asStringArray(input.aliases),
          category: asString(input.category),
          path: asString(input.path),
          cursor: asString(input.cursor),
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

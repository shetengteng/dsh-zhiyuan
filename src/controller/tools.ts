import { createJobRunner, type JobRunner } from '../platform/jobs.ts'
import { resolveDataRoot } from '../platform/paths.ts'
import { formatBaseDisplayTitle } from '../model/constants.ts'
import { KbError } from '../model/types.ts'
import { listBases } from '../service/kb/base-tree.ts'
import { importFiles } from '../service/kb/import.ts'
import { renderSearchResult, searchPresentationMeta } from '../service/search/result/templates/index.ts'
import { searchKnowledgeBase } from './search-operation.ts'
import { asToolRecord, buildToolImportInput, buildToolSearchRequest } from './tool-input.ts'
import { renderImportResult } from './tool-render.ts'

type ToolCtx = {
  tools: { register: (def: unknown) => () => void }
}

function fail(error: unknown): never {
  if (error instanceof KbError) throw new Error(error.message)
  throw error
}

const searchOutputSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['kind', 'scope', 'baseId', 'query', 'files', 'totalFiles', 'totalHits', 'page', 'scan', 'presentation'],
      properties: {
        kind: { type: 'string', enum: ['overview'] },
        scope: { type: 'string', enum: ['files'] },
        baseId: { type: 'string' },
        category: { type: 'string' },
        query: { type: 'object', required: ['terms', 'aliases'], properties: { terms: { type: 'array' }, aliases: { type: 'array' } } },
        files: { type: 'array', description: '本页文件摘要，不包含命中正文', items: { type: 'object', required: ['path', 'format', 'totalHits'], properties: { path: { type: 'string' }, format: { type: 'string' }, totalHits: { type: 'integer' } } } },
        totalFiles: { type: 'integer' },
        totalHits: { type: 'integer' },
        page: { type: 'object', required: ['scope', 'returnedFiles', 'hasMore'], properties: { scope: { type: 'string' }, returnedFiles: { type: 'integer' }, hasMore: { type: 'boolean' }, nextCursor: { type: 'string' } } },
        scan: { type: 'object', required: ['complete', 'warnings'], properties: { complete: { type: 'boolean' }, warnings: { type: 'array' }, stopReason: { type: 'string' } } },
        presentation: { type: 'object', required: ['template', 'version'], properties: { template: { type: 'string' }, version: { type: 'integer' } } },
      },
    },
    {
      type: 'object',
      required: ['kind', 'scope', 'baseId', 'query', 'path', 'format', 'totalHits', 'hits', 'page', 'scan', 'presentation'],
      properties: {
        kind: { type: 'string', enum: ['file-detail'] },
        scope: { type: 'string', enum: ['hits'] },
        baseId: { type: 'string' },
        category: { type: 'string' },
        query: { type: 'object', required: ['terms', 'aliases'], properties: { terms: { type: 'array' }, aliases: { type: 'array' } } },
        path: { type: 'string' },
        format: { type: 'string' },
        totalHits: { type: 'integer' },
        groupHeader: { type: 'string' },
        hits: { type: 'array' },
        page: { type: 'object', required: ['scope', 'returnedHits', 'hasMore'], properties: { scope: { type: 'string' }, returnedHits: { type: 'integer' }, hasMore: { type: 'boolean' }, nextCursor: { type: 'string' } } },
        scan: { type: 'object', required: ['complete', 'warnings'], properties: { complete: { type: 'boolean' }, warnings: { type: 'array' }, stopReason: { type: 'string' } } },
        presentation: { type: 'object', required: ['template', 'version'], properties: { template: { type: 'string' }, version: { type: 'integer' } } },
      },
    },
  ],
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
          return [{ type: 'text' as const, text: bases.map((item) => `${item.id} ${formatBaseDisplayTitle(item.title, item.id)}`).join(' · ') || '还没有知识库' }]
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
      name: 'kb_import',
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
        render: (_args: unknown, value: unknown) => renderImportResult(value),
      },
      execute: async (args: unknown) => {
        const input = asToolRecord(args)
        try {
          const dataRoot = await resolveDataRoot()
          return await jobs.enqueue('import', () => importFiles(dataRoot, buildToolImportInput(input)))
        } catch (error) {
          fail(error)
        }
      },
    }),
    ctx.tools.register({
      name: 'kb_search',
      description: '在指定知识库中使用 ripgrep Rust 正则检索。首次调用返回文件概览；传入 path 后返回单文件命中详情。file-detail 仍必须携带 query，以及原查询使用过的 aliases，不能只传 baseId/path。path 始终是知识库根目录下的 POSIX 相对路径，例如 aa/bb/cc.md。续页只传上一页的 cursor 和可选 limit。',
      parameters: {
        type: 'object',
        oneOf: [
          { required: ['baseId', 'query'] },
          { required: ['cursor'] },
        ],
        properties: {
          baseId: { type: 'string', description: '首次查询必填，必须是真实存在的知识库 id' },
          query: { type: 'string', description: '首次 overview 或带 path 的 file-detail 都必填，ripgrep Rust 正则表达式' },
          aliases: { type: 'array', items: { type: 'string' }, description: '额外的 ripgrep 正则表达式，最多 8 个；file-detail 时沿用首次查询的 aliases' },
          category: { type: 'string', description: '已存在的库内类目；缺省表示整个知识库' },
          path: { type: 'string', description: '知识库根目录相对 POSIX 文件路径，例如 aa/bb/cc.md；必须与 baseId 和 query 一起传，不能只传 baseId/path；传入后进入 file-detail' },
          limit: { type: 'integer', minimum: 1, maximum: 100, description: 'overview 表示文件数，file-detail 表示命中数，默认 20' },
          cursor: { type: 'string', description: '上一页返回的 v3 游标；续页时不能同时传 baseId/query/category/path' },
        },
      },
      output: {
        schema: searchOutputSchema,
        render: (_args: unknown, value: unknown) => renderSearchResult({}, value),
        presentationMeta: (_args: unknown, value: unknown) => searchPresentationMeta(value),
      },
      presentCall: () => ({ card: 'generic', title: '知识库检索' }),
      presentResult: (_args: unknown, result: { isError: boolean }) => (
        result.isError ? { card: 'generic', title: '检索失败' } : { card: 'generic', title: '知识库检索结果' }
      ),
      execute: async (args: unknown) => {
        const input = asToolRecord(args)
        try {
          const dataRoot = await resolveDataRoot()
          return await searchKnowledgeBase(dataRoot, buildToolSearchRequest(input))
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

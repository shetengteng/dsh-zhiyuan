import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { registerKbTools } from '../src/controller/tool/kb-tool-controller.ts'
import type { JobRunner } from '../src/platform/jobs.ts'
import { setDataRootForTest } from '../src/platform/paths.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from '../src/service/kb/knowledge-services.ts'

const knowledgeServices = createKnowledgeServices(new FileCatalogRepository())
const { createKb } = knowledgeServices

type SearchTool = {
  name: 'kb_search'
  execute: (args?: unknown) => Promise<unknown>
  output: {
    render: (args: unknown, value: unknown) => Array<{ type: string; text: string }>
  }
}

type DetailResult = {
  kind: 'file-detail'
  path: string
  totalHits: number
  hits: unknown[]
  page: {
    hasMore: boolean
    nextCursor?: string
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asDetailResult(value: unknown): DetailResult {
  const result = asRecord(value)
  const page = asRecord(result?.page)
  if (!result || result.kind !== 'file-detail' || typeof result.path !== 'string'
    || typeof result.totalHits !== 'number' || !Array.isArray(result.hits)
    || !page || typeof page.hasMore !== 'boolean'
    || (page.nextCursor !== undefined && typeof page.nextCursor !== 'string')) {
    throw new Error('Tool 未返回有效 file-detail')
  }
  return value as DetailResult
}

function instantJobs(): JobRunner {
  return {
    enqueue: async (_op, work) => work(),
    status: () => ({ running: false, failed: [] }),
  }
}

function captureSearchTool(): SearchTool {
  let searchTool: SearchTool | undefined
  registerKbTools({
    tools: {
      register: (definition: unknown) => {
        const tool = definition as SearchTool
        if (tool.name === 'kb_search') searchTool = tool
        return () => undefined
      },
    },
  }, instantJobs(), knowledgeServices)
  if (!searchTool) throw new Error('kb_search 未注册')
  return searchTool
}

async function withRoot(work: (root: string, searchTool: SearchTool) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'zy-search-regression-'))
  setDataRootForTest(root)
  try {
    await work(root, captureSearchTool())
  } finally {
    setDataRootForTest(undefined)
    await rm(root, { recursive: true, force: true })
  }
}

async function createSupplierKb(root: string): Promise<string> {
  const kb = await createKb(root, { title: '供应商测试库', description: '检索回归测试' })
  const kbRoot = join(root, 'kbs', kb.id)
  await mkdir(kbRoot, { recursive: true })
  const rows = Array.from({ length: 25 }, (_, index) => `苏州吴门精密,${index % 5 === 0 ? '特殊备注' : '常规采购'}`)
  await writeFile(join(kbRoot, '供应商台账.csv'), `供应商,备注\n${rows.join('\n')}\n`)
  return kb.id
}

describe('知源检索回归', { concurrency: false }, () => {
  test('Tool 使用真实 nextCursor 连续翻完大量文件命中', async () => {
    await withRoot(async (root, searchTool) => {
      const kbId = await createSupplierKb(root)
      let page = asDetailResult(await searchTool.execute({
        kbId,
        query: '苏州吴门精密',
        path: '供应商台账.csv',
        limit: 5,
      }))
      const firstCursor = page.page.nextCursor
      if (!page.page.hasMore || !firstCursor) throw new Error('首个详情页缺少 nextCursor')
      assert.notEqual(firstCursor, 'cursor')
      const firstText = searchTool.output.render({}, page)[0]?.text ?? ''
      assert.ok(firstText.includes(`\`${firstCursor}\``), 'Tool 文本必须提供可复制的真实 cursor')

      let totalReturnedHits = 0
      for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
        totalReturnedHits += page.hits.length
        if (!page.page.hasMore) {
          assert.equal(page.page.nextCursor, undefined)
          assert.equal(totalReturnedHits, 25)
          assert.equal(page.totalHits, 25)
          return
        }
        const cursor = page.page.nextCursor
        if (!cursor) throw new Error(`第 ${pageNumber + 1} 页缺少 nextCursor`)
        page = asDetailResult(await searchTool.execute({ cursor, limit: 5 }))
      }
      throw new Error('检索分页超过预期页数')
    })
  })

  test('Tool 拒绝 lookaround，并给出正向检索提示', async () => {
    await withRoot(async (root, searchTool) => {
      const kbId = await createSupplierKb(root)
      await assert.rejects(
        () => searchTool.execute({ kbId, query: '(?!常规采购)' }),
        (error: unknown) => error instanceof Error
          && /不支持的正则语法/.test(error.message)
          && /正向匹配/.test(error.message),
      )
    })
  })
})

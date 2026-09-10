import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { registerKbCommands } from '../src/controller/command/kb-command-controller.ts'
import { COMMAND_NAME } from '../src/model/constants.ts'
import { createJobRunner, type JobRunner } from '../src/platform/jobs.ts'
import { setDataRootForTest } from '../src/platform/paths.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { createKnowledgeServices } from '../src/service/kb/knowledge-services.ts'

const knowledgeServices = createKnowledgeServices(new FileCatalogRepository())
const { createKb, resolveImportTo } = knowledgeServices

type CmdResult = { kind: 'success' | 'error'; text?: string }
type Handler = (input: { rawInput: string }) => Promise<CmdResult>

function instantJobs(): JobRunner {
  return {
    enqueue: async (_op, work) => work(),
    status: () => ({ running: false, failed: [] }),
  }
}

function capture(jobs: JobRunner = instantJobs()): { handler: Handler; def: Record<string, unknown> } {
  let def: Record<string, unknown> = {}
  registerKbCommands({
    commands: {
      register: (item: unknown) => {
        def = item as Record<string, unknown>
        return () => {}
      },
    },
  }, jobs, knowledgeServices)
  const handler = def.handler as Handler | undefined
  if (!handler) throw new Error('命令未注册')
  return { handler, def }
}

async function withRoot(
  fn: (root: string, run: (line: string) => Promise<CmdResult>) => Promise<void>,
  jobs: JobRunner = instantJobs(),
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'zy-cmd-'))
  setDataRootForTest(root)
  try {
    const { handler } = capture(jobs)
    await fn(root, (line) => handler({ rawInput: line }))
  } finally {
    setDataRootForTest(undefined)
    await rm(root, { recursive: true, force: true })
  }
}

function json(result: CmdResult): unknown {
  assert.equal(result.kind, 'success')
  return JSON.parse(result.text ?? 'null')
}

function callLine(payload: Record<string, unknown>): string {
  return `call '${JSON.stringify(payload)}'`
}

async function createTestKb(root: string) {
  return createKb(root, { title: '工作库', description: '描述' })
}

describe('kb 斜杠命令', { concurrency: false }, () => {
  test('注册 name=kb，不记录输入', () => {
    const { def } = capture()
    assert.equal(def.name, COMMAND_NAME)
    assert.equal(def.recordInput, false)
    assert.match(String(def.description), /知源/)
  })

  test('空输入与 status 返回队列状态', async () => {
    const jobs: JobRunner = {
      enqueue: async (_op, work) => work(),
      status: () => ({ running: true, op: 'import', failed: [{ op: 'import', message: 'x', at: 1 }] }),
    }
    const { handler } = capture(jobs)
    assert.deepEqual(json(await handler({ rawInput: '' })), jobs.status())
    assert.deepEqual(json(await handler({ rawInput: '  status  ' })), jobs.status())
  })

  test('未知子命令给出用法', async () => {
    const { handler } = capture()
    const result = await handler({ rawInput: 'help' })
    assert.equal(result.kind, 'error')
    assert.match(result.text ?? '', /用法/)
  })

  test('import 缺 path / --kb / --to 分别报错', async () => {
    await withRoot(async (_root, run) => {
      assert.match((await run('import')).text ?? '', /用法/)
      assert.match((await run('import /tmp/a.md')).text ?? '', /必须指定 --kb/)
      assert.match((await run('import /tmp/a.md --kb work')).text ?? '', /--to|--root/)
    })
  })

  test('import 无 --to 时复用上次类目；--root 仍进库根', async () => {
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      const first = join(root, 'a.md')
      const second = join(root, 'b.md')
      const third = join(root, 'c.md')
      await writeFile(first, 'one')
      await writeFile(second, 'two')
      await writeFile(third, 'three')
      json(await run(`import ${first} --kb ${kb.id} --to 合同/2024`))
      const reused = json(await run(`import ${second} --kb ${kb.id}`)) as { copied: string[] }
      assert.ok(reused.copied.includes('合同/2024/b.md'))
      const rooted = json(await run(`import ${third} --kb ${kb.id} --root`)) as { copied: string[] }
      assert.ok(rooted.copied.includes('c.md'))
    })
  })

  test('import --to 入队并拷进类目；源文件不改', async () => {
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      const src = join(root, '供应商合同.md')
      await writeFile(src, '条款')
      const body = json(await run(`import ${src} --kb ${kb.id} --to 合同/2024`)) as { copied: string[] }
      assert.ok(body.copied.includes('合同/2024/供应商合同.md'))
      assert.equal(existsSync(join(root, 'kbs', kb.id, '合同', '2024', '供应商合同.md')), true)
    })
  })

  test('import --root 与 --path；--preserve-tree / --no-create', async () => {
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      const src = join(root, 'a.md')
      await writeFile(src, 'hi')
      const rooted = json(await run(`import --path ${src} --kb ${kb.id} --root`)) as { copied: string[] }
      assert.ok(rooted.copied.includes('a.md'))

      const nested = join(root, 'src', '子', 'b.md')
      await mkdir(join(root, 'src', '子'), { recursive: true })
      await writeFile(nested, 'tree')
      const preserved = json(await run(`import ${join(root, 'src')} --kb ${kb.id} --to 归档 --preserve-tree`)) as {
        copied: string[]
      }
      assert.ok(preserved.copied.some((item) => item.includes('子/b.md')))

      const missing = await run(`import ${src} --kb ${kb.id} --to 尚不存在 --no-create`)
      assert.equal(missing.kind, 'error')
      assert.match(missing.text ?? '', /类目不存在/)
    })
  })

  test('search：rest 作 query，--aliases 中英文逗号，--to 收窄类目', async () => {
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      await mkdir(join(root, 'kbs', kb.id, '合同', '2024'), { recursive: true })
      await mkdir(join(root, 'kbs', kb.id, '会议'), { recursive: true })
      await writeFile(join(root, 'kbs', kb.id, '合同', '2024', '供应商合同.md'), '若乙方违约则解约。\n')
      await writeFile(join(root, 'kbs', kb.id, '会议', '纪要.md'), '周会无合同。\n')
      const result = json(await run(`search 违约 --kb ${kb.id} --aliases 解约，termination --to 合同/2024`)) as {
        kind: 'overview'
        files: Array<{ path: string; totalHits: number }>
        totalFiles: number
        totalHits: number
        page: { hasMore: boolean }
      }
      assert.equal(result.kind, 'overview')
      assert.ok(result.files.length >= 1)
      assert.ok(result.files.every((group) => group.path.includes('供应商合同')))
      assert.equal(result.totalFiles, 1)
      assert.equal(result.totalHits, 1)
      assert.equal(result.files[0]?.totalHits, 1)
    })
  })

  test('search 可用 --query；缺 base 走业务错误', async () => {
    await withRoot(async (_root, run) => {
      const result = await run('search --query 违约')
      assert.equal(result.kind, 'error')
      assert.match(result.text ?? '', /kbId/)
    })
  })

  test('search 续页拒绝混入首次查询字段', async () => {
    await withRoot(async (_root, run) => {
      const result = await run('search --cursor cursor --kb work')
      assert.equal(result.kind, 'error')
      assert.match(result.text ?? '', /续页请求只能包含 cursor 和 limit/)
    })
  })

  test('call 非法 JSON / 未知 op 报错', async () => {
    await withRoot(async (_root, run) => {
      assert.equal((await run('call')).kind, 'error')
      assert.equal((await run('call {')).kind, 'error')
      const unknown = await run('call {"op":"explode"}')
      assert.equal(unknown.kind, 'error')
      assert.match(unknown.text ?? '', /未知操作/)
    })
  })
})

describe('kb call', { concurrency: false }, () => {
  test('list / create / update / deleteKb', async () => {
    await withRoot(async (_root, run) => {
      assert.deepEqual(json(await run(callLine({ op: 'list' }))), [])
      const created = json(await run(callLine({
        op: 'create',
        id: 'work',
        title: '工作库',
        description: '描述',
        aliases: ['工作', ' 公司 '],
      }))) as { id: string; aliases: string[] }
      assert.match(created.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      assert.deepEqual(created.aliases, ['工作', '公司'])
      const listed = json(await run(callLine({ op: 'list' }))) as Array<{ id: string }>
      assert.equal(listed.length, 1)
      const updated = json(await run(callLine({ op: 'update', id: created.id, title: '公司库' }))) as { title: string; id: string }
      assert.equal(updated.id, created.id)
      assert.equal(updated.title, '公司库')
      const denied = await run(callLine({ op: 'deleteKb', id: created.id }))
      assert.equal(denied.kind, 'error')
      assert.match(denied.text ?? '', /确认/)
      assert.deepEqual(json(await run(callLine({ op: 'deleteKb', id: created.id, confirm: true }))), { ok: true })
      assert.deepEqual(json(await run(callLine({ op: 'list' }))), [])
    })
  })

  test('tree / read / write / deleteEntry', async () => {
    await withRoot(async (_root, run) => {
      const kb = await createTestKb(_root)
      assert.deepEqual(json(await run(callLine({ op: 'write', id: kb.id, path: '合同/2024/a.md', change: { kind: 'text', text: 'hello' } }))), { ok: true })
      const entry = json(await run(callLine({ op: 'read', id: kb.id, path: '合同/2024/a.md' }))) as { text: string }
      assert.equal(entry.text, 'hello')
      const tree = json(await run(callLine({ op: 'tree', id: kb.id }))) as Array<{ name: string; kind: string }>
      assert.equal(tree[0].name, '合同')
      assert.equal(tree[0].kind, 'dir')
      const denied = await run(callLine({ op: 'deleteEntry', id: kb.id, path: '合同/2024/a.md' }))
      assert.equal(denied.kind, 'error')
      assert.deepEqual(json(await run(callLine({ op: 'deleteEntry', id: kb.id, path: '合同/2024/a.md', confirm: true }))), { ok: true })
      const missing = await run(callLine({ op: 'read', id: kb.id, path: '合同/2024/a.md' }))
      assert.equal(missing.kind, 'error')
      assert.match(missing.text ?? '', /不存在/)
    })
  })

  test('表格分页和修改写入走私有操作边界并校验输入', async () => {
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      assert.deepEqual(json(await run(callLine({ op: 'write', id: kb.id, path: 'table.csv', change: { kind: 'text', text: '名称,金额\n甲,120\n乙,80' } }))), { ok: true })
      const preview = json(await run(callLine({ op: 'read', id: kb.id, path: 'table.csv', view: 'tree', readMode: 'edit' }))) as {
        table: { revision: string }
      }
      const page = json(await run(callLine({ op: 'readPage', id: kb.id, path: 'table.csv', startRow: 2, pageSize: 1 }))) as {
        windowStartRow: number
        rows: string[][]
      }
      assert.equal(page.windowStartRow, 2)
      assert.deepEqual(page.rows, [['乙', '80']])

      const invalid = await run(callLine({
        op: 'write',
        id: kb.id,
        path: 'table.csv',
        change: { kind: 'table-patch', patch: { revision: preview.table.revision, headerChanges: [{ column: -1, value: '名称' }], cellChanges: [] } },
      }))
      assert.equal(invalid.kind, 'error')
      assert.match(invalid.text ?? '', /非负整数/)

      assert.deepEqual(json(await run(callLine({
        op: 'write',
        id: kb.id,
        path: 'table.csv',
        change: { kind: 'table-patch', patch: { revision: preview.table.revision, headerChanges: [], cellChanges: [{ row: 2, column: 1, value: '90' }] } },
      }))), { ok: true })
    })
  })

  test('prefs / setPrefs 只改给出的字段，并拒绝非法偏好', async () => {
    await withRoot(async (_root, run) => {
      const created = json(await run(callLine({ op: 'create', title: '工作库', description: '描述' }))) as { id: string }
      const prefs = json(await run(callLine({ op: 'prefs' }))) as { defaultKbId: string; maxFileBytes: number }
      assert.equal(prefs.defaultKbId, created.id)
      const updated = json(await run(callLine({ op: 'setPrefs', maxFileBytes: 1024, defaultKbId: created.id }))) as {
        maxFileBytes: number
        defaultKbId: string
        maxKbBytes: number
      }
      assert.equal(updated.maxFileBytes, 1024)
      assert.equal(updated.defaultKbId, created.id)
      assert.ok(updated.maxKbBytes > 1024)
      const invalid = await run(callLine({ op: 'setPrefs', maxFileBytes: 'nope' }))
      assert.equal(invalid.kind, 'error')
      assert.match(invalid.text ?? '', /maxFileBytes/)
      const invalidDefault = await run(callLine({ op: 'setPrefs', defaultKbId: 1 }))
      assert.equal(invalidDefault.kind, 'error')
      assert.match(invalidDefault.text ?? '', /defaultKbId/)
      const tooLarge = await run(callLine({ op: 'setPrefs', maxKbBytes: Number.MAX_SAFE_INTEGER }))
      assert.equal(tooLarge.kind, 'error')
      assert.match(tooLarge.text ?? '', /额度/)
      const afterInvalid = json(await run(callLine({ op: 'prefs' }))) as { maxFileBytes: number }
      assert.equal(afterInvalid.maxFileBytes, 1024)
    })
  })

  test('call search / import 走同一套 Host 函数', async () => {
    const jobs = createJobRunner()
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      const src = join(root, 'a.md')
      await writeFile(src, '违约条款')
      const copied = json(await run(callLine({
        op: 'import',
        kbId: kb.id,
        sourcePath: src,
        destCategory: '合同/2024',
        preserveTree: false,
      }))) as { copied: string[] }
      assert.ok(copied.copied.includes('合同/2024/a.md'))
      const found = json(await run(callLine({
        op: 'search',
        kbId: kb.id,
        query: '违约',
        aliases: ['条款'],
        category: '合同/2024',
      }))) as {
        kind: 'overview'
        files: Array<{ path: string; totalHits: number }>
        totalHits: number
      }
      assert.equal(found.kind, 'overview')
      assert.equal(found.files.length, 1)
      assert.equal(found.files[0]?.path, '合同/2024/a.md')
      assert.equal(found.files[0]?.totalHits, 1)
      assert.equal(found.totalHits, 1)

      const detail = json(await run(callLine({
        op: 'search',
        kbId: kb.id,
        query: '违约',
        aliases: ['条款'],
        category: '合同/2024',
        path: '合同/2024/a.md',
      }))) as {
        kind: 'file-detail'
        path: string
        hits: Array<{ excerpt: string }>
      }
      assert.equal(detail.kind, 'file-detail')
      assert.equal(detail.path, '合同/2024/a.md')
      assert.ok(detail.hits[0]?.excerpt.includes('违约'))
    }, jobs)
  })

  test('resolveImportTo：--to 优先，--root 次之，否则上次类目', async () => {
    await withRoot(async (root) => {
      const kb = await createTestKb(root)
      assert.equal(await resolveImportTo(root, kb.id, '合同/2024', false), '合同/2024')
      assert.equal(await resolveImportTo(root, kb.id, undefined, true), '')
      await assert.rejects(() => resolveImportTo(root, kb.id, undefined, false), /--to/)
    })
  })

  test('registerKbCommands 返回 disposer', () => {
    let disposed = false
    const dispose = registerKbCommands({
      commands: { register: () => () => { disposed = true } },
    }, instantJobs(), knowledgeServices)
    dispose()
    assert.equal(disposed, true)
  })

  test('call import createMissing=false 时类目不存在则失败', async () => {
    await withRoot(async (root, run) => {
      const kb = await createTestKb(root)
      const src = join(root, 'a.md')
      await writeFile(src, 'x')
      const result = await run(callLine({
        op: 'import',
        kbId: kb.id,
        sourcePath: src,
        destCategory: '没有这个',
        createMissing: false,
      }))
      assert.equal(result.kind, 'error')
      assert.match(result.text ?? '', /类目不存在/)
    })
  })
})

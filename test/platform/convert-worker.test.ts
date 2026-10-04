import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { KbError } from '../../src/model/error/kb-error.ts'
import { runIsolatedConversion, type ConvertWorkerSpec } from '../../src/platform/convert-worker.ts'

// 转换子进程隔离测试：用夹具 worker 验证超时硬终止、帧限额、失败帧与断连自退。

function fixtureSpec(name: string): ConvertWorkerSpec {
  return {
    builtFileName: `${name}.built-does-not-exist.js`,
    sourceUrl: new URL(`./fixtures/${name}.mjs`, import.meta.url),
  }
}

test('正常帧：产物与警告都返回，done 后结束', async () => {
  const conversion = await runIsolatedConversion(
    fixtureSpec('echo-worker'),
    { bytes: Buffer.from('内容'), outputName: 'a.md', warnings: ['提示一'] },
    { timeoutMs: 10_000 },
  )
  assert.equal(conversion.outputs.length, 1)
  const output = conversion.outputs[0]!
  assert.equal(output.outputName, 'a.md')
  assert.equal(output.byteLength, 6)
  assert.equal(Buffer.from(output.bytes).toString('utf8'), '内容')
  assert.deepEqual(conversion.warnings, ['提示一'])
})

test('失败帧：白名单外 code 归一为 io_failed', async () => {
  await assert.rejects(
    () => runIsolatedConversion(fixtureSpec('fail-worker'), { code: 'custom_leak', message: '内部细节' }, { timeoutMs: 10_000 }),
    (error: unknown) => error instanceof KbError && error.code === 'io_failed' && error.message === '内部细节',
  )
})

test('超时：30s 默认内强制终止，抛 io_failed', async () => {
  const started = Date.now()
  await assert.rejects(
    () => runIsolatedConversion(fixtureSpec('slow-worker'), {}, { timeoutMs: 300 }),
    (error: unknown) => error instanceof KbError && error.message.includes('超时'),
  )
  assert.ok(Date.now() - started < 5_000)
})

test('累计帧限额：超 20MB 兜底即失败，不再接受后续帧', async () => {
  await assert.rejects(
    () => runIsolatedConversion(fixtureSpec('oversize-worker'), { chunkBytes: 11 * 1024 * 1024 }, { timeoutMs: 20_000, maxTotalBytes: 20 * 1024 * 1024 }),
    (error: unknown) => error instanceof KbError && error.code === 'file_too_large',
  )
})

test('断连自退：父进程关闭 IPC 后夹具 worker 自动退出', async () => {
  const entryPath = fileURLToPath(new URL('./fixtures/disconnect-worker.mjs', import.meta.url))
  const child = fork(entryPath, [], { stdio: 'ignore' })
  const exited = new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)))
  // 等子进程完成 IPC 引导再断连，避免与启动竞态
  await new Promise<void>((resolve, reject) => {
    child.once('message', (raw) => {
      if (typeof raw === 'object' && raw !== null && (raw as { ready?: unknown }).ready === true) resolve()
      else reject(new Error('夹具 worker 应答异常'))
    })
    child.send({})
  })
  child.disconnect()
  const code = await exited
  assert.equal(code, 0)
})

test('意外帧：非契约负载被拒绝并杀掉子进程', async () => {
  await assert.rejects(
    () => runIsolatedConversion(fixtureSpec('garbage-worker'), {}, { timeoutMs: 5_000 }),
    (error: unknown) => error instanceof KbError && error.message.includes('意外'),
  )
})

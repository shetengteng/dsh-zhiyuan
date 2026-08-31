import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createJobRunner, type JobRunner } from '../src/jobs.ts'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('enqueue 串行：后一个等前一个结束', async () => {
  const jobs = createJobRunner()
  const order: number[] = []
  const first = jobs.enqueue('a', async () => {
    await delay(20)
    order.push(1)
    return 'one'
  })
  const second = jobs.enqueue('b', async () => {
    order.push(2)
    return 'two'
  })
  assert.deepEqual(await Promise.all([first, second]), ['one', 'two'])
  assert.deepEqual(order, [1, 2])
})

test('执行中 status 带 running 与 op；结束后清掉', async () => {
  const jobs = createJobRunner()
  let during: ReturnType<JobRunner['status']> | undefined
  const run = jobs.enqueue('ingest', async () => {
    during = jobs.status()
    return { ok: true }
  })
  await run
  assert.equal(during?.running, true)
  assert.equal(during?.op, 'ingest')
  const after = jobs.status()
  assert.equal(after.running, false)
  assert.equal(after.op, undefined)
})

test('失败写入 failed 并继续抛出；后续任务仍能跑', async () => {
  const jobs = createJobRunner()
  await assert.rejects(() => jobs.enqueue('ingest', async () => {
    throw new Error('boom')
  }), /boom/)
  const st = jobs.status()
  assert.equal(st.failed.length, 1)
  assert.equal(st.failed[0].op, 'ingest')
  assert.equal(st.failed[0].message, 'boom')
  assert.equal(typeof st.failed[0].at, 'number')
  assert.equal(await jobs.enqueue('other', async () => 7), 7)
})

test('非 Error 失败也记 message；failed 只留最近 20 条', async () => {
  const jobs = createJobRunner()
  await assert.rejects(() => jobs.enqueue('x', async () => {
    throw 'plain'
  }))
  assert.equal(jobs.status().failed[0].message, 'plain')
  for (let i = 0; i < 25; i += 1) {
    await assert.rejects(() => jobs.enqueue('ingest', async () => {
      throw new Error(`n${i}`)
    }))
  }
  const failed = jobs.status().failed
  assert.equal(failed.length, 20)
  assert.equal(failed[0].message, 'n5')
  assert.equal(failed[19].message, 'n24')
})

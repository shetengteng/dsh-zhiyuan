import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  kbCall,
  kbStatus,
  resolveSession,
  unwrapCommandResult,
  type Remote,
  type SessionsHandle,
  type WorkspacesHandle,
} from '../src/client/bridge.ts'

test('unwrapCommandResult：ok 信封、裸 result、失败与缺 result', () => {
  assert.deepEqual(
    unwrapCommandResult({ ok: true, value: { result: { kind: 'success', text: '{}' } } }),
    { kind: 'success', text: '{}' },
  )
  assert.deepEqual(unwrapCommandResult({ result: { kind: 'success', text: '1' } }), { kind: 'success', text: '1' })
  assert.deepEqual(unwrapCommandResult({ kind: 'success', text: 'x' }), { kind: 'success', text: 'x' })
  assert.deepEqual(unwrapCommandResult(undefined), {})
  assert.throws(() => unwrapCommandResult({ ok: false, error: { message: '断连' } }), /断连/)
  assert.throws(() => unwrapCommandResult({ ok: false, error: { code: 'E' } }), /E/)
  assert.throws(() => unwrapCommandResult({ ok: false }), /命令失败/)
  assert.throws(() => unwrapCommandResult({ ok: true }), /Host 未注册/)
})

test('resolveSession：已有会话优先；否则连最近工作区；再否则 create', async () => {
  assert.equal(await resolveSession({
    open: () => {},
    list: { getSnapshot: () => ({ current: 's1' }) },
  }), 's1')

  const opened: string[] = []
  const connected = await resolveSession(
    { open: (id) => opened.push(id) },
    {
      connectWorkspace: async (id) => `sess-${id}`,
      list: { getSnapshot: () => ({ recentWorkspaceId: 'ws1' }) },
    },
  )
  assert.equal(connected, 'sess-ws1')
  assert.deepEqual(opened, ['sess-ws1'])

  const created: string[] = []
  const fresh = await resolveSession({
    open: (id) => created.push(id),
    create: async () => 'new-s',
  })
  assert.equal(fresh, 'new-s')
  assert.deepEqual(created, ['new-s'])

  await assert.rejects(() => resolveSession(), /当前没有会话/)
})

test('resolveSession：snapshot 抛错当没有；工作区 items[0] 兜底', async () => {
  const id = await resolveSession(
    { open: () => {}, list: { getSnapshot: () => { throw new Error('snap') } } },
    {
      connectWorkspace: async (ws) => `s-${ws}`,
      list: { getSnapshot: () => ({ items: [{ workspaceId: 'ws2' }] }) },
    },
  )
  assert.equal(id, 's-ws2')
})

test('kbCall / kbStatus：无通道、Host error、空 text', async () => {
  await assert.rejects(() => kbCall(undefined, undefined, undefined, { op: 'list' }), /断连/)
  await assert.rejects(() => kbStatus(undefined, undefined, undefined), /断连/)

  const sessions: SessionsHandle = {
    open: () => {},
    list: { getSnapshot: () => ({ current: 's1' }) },
  }
  const remote: Remote = {
    commands: {
      execute: async (_sid, line) => {
        if (line.startsWith('/kb call')) {
          return { ok: true, value: { result: { kind: 'success', text: '{"bases":[]}' } } }
        }
        return { ok: true, value: { result: { kind: 'success', text: '' } } }
      },
    },
  }
  assert.deepEqual(await kbCall(remote, sessions, undefined, { op: 'list' }), { bases: [] })
  assert.deepEqual(await kbStatus(remote, sessions, undefined), { running: false, failed: [] })

  const failing: Remote = {
    commands: {
      execute: async () => ({ ok: true, value: { result: { kind: 'error', text: 'boom' } } }),
    },
  }
  await assert.rejects(() => kbCall(failing, sessions, undefined, { op: 'list' }), /boom/)
  await assert.rejects(() => kbStatus(failing, sessions, undefined), /boom/)
})

test('kbCall 发出 /kb call JSON；kbStatus 发 /kb status', async () => {
  const lines: string[] = []
  const sessions: SessionsHandle = {
    open: () => {},
    list: { getSnapshot: () => ({ current: 's1' }) },
  }
  const remote: Remote = {
    commands: {
      execute: async (_sid, line) => {
        lines.push(line)
        return { ok: true, value: { result: { kind: 'success', text: '{"ok":true}' } } }
      },
    },
  }
  await kbCall(remote, sessions, undefined as WorkspacesHandle | undefined, { op: 'list' })
  await kbStatus(remote, sessions, undefined)
  assert.equal(lines[0], '/kb call {"op":"list"}')
  assert.equal(lines[1], '/kb status')
})

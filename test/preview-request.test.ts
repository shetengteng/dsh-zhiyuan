import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPreviewRequestManager } from '../src/client/settings/preview/preview-request.ts'

test('新预览请求会取消旧请求并拒绝旧结果写回', () => {
  const manager = createPreviewRequestManager()
  const first = manager.start()
  const second = manager.start()

  assert.equal(first.signal.aborted, true)
  assert.equal(manager.isCurrent(first.id), false)
  assert.equal(manager.isCurrent(second.id), true)

  manager.clear(first.id)
  assert.equal(manager.isCurrent(second.id), true)
})

test('关闭预览会取消当前请求并使其失效', () => {
  const manager = createPreviewRequestManager()
  const request = manager.start()

  manager.cancel()

  assert.equal(request.signal.aborted, true)
  assert.equal(manager.isCurrent(request.id), false)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { claimFileDrag, isFileDrag } from '../../src/view/settings/drag-utils.ts'

/** 构造模拟 DataTransfer，用于拖拽判定测试。 */
function transfer(input: {
  path?: string
  name?: string
  uriList?: string
  plain?: string
  types?: string[]
}): DataTransfer {
  const file = input.path || input.name
    ? { name: input.name ?? 'a.csv', path: input.path } as File & { path?: string }
    : null
  const files = {
    length: file ? 1 : 0,
    item: (index: number) => (index === 0 ? file : null),
  }
  const data: Record<string, string> = {
    'text/uri-list': input.uriList ?? '',
    'text/plain': input.plain ?? '',
  }
  return {
    files,
    items: file ? [{ kind: 'file', getAsFile: () => file }] : [],
    types: input.types ?? [...(file ? ['Files'] : []), ...Object.keys(data).filter((type) => data[type])],
    getData: (type: string) => data[type] ?? '',
  } as unknown as DataTransfer
}

test('claimFileDrag 拦截只暴露 file URI 类型的拖放', () => {
  const dataTransfer = transfer({ uriList: 'file:///tmp/a.csv', types: ['text/uri-list'] })
  let prevented = false
  let stopped = false
  const claimed = claimFileDrag({
    preventDefault() { prevented = true },
    stopPropagation() { stopped = true },
    dataTransfer,
  }, 'copy')
  assert.equal(claimed, true)
  assert.equal(prevented, true)
  assert.equal(stopped, true)
  assert.equal(dataTransfer.dropEffect, 'copy')
  assert.equal(isFileDrag(dataTransfer), true)
})

test('claimFileDrag 拦截 Files 拖放并设置 dropEffect', () => {
  const dataTransfer = transfer({ path: '/tmp/a.csv' })
  let stopped = false
  const claimed = claimFileDrag({
    preventDefault() {},
    stopPropagation() { stopped = true },
    dataTransfer,
  }, 'copy')
  assert.equal(claimed, true)
  assert.equal(stopped, true)
  assert.equal(dataTransfer.dropEffect, 'copy')
  assert.equal(isFileDrag(dataTransfer), true)
})

test('claimFileDrag 在 types 尚未填 Files 时仍拦截', () => {
  const dataTransfer = transfer({ types: [] })
  assert.equal(claimFileDrag({
    preventDefault() {},
    stopPropagation() {},
    dataTransfer,
  }, 'copy'), true)
})

test('claimFileDrag 不拦截普通文本拖放', () => {
  const dataTransfer = transfer({ plain: 'hello', types: ['text/plain'] })
  assert.equal(claimFileDrag({
    preventDefault() {},
    stopPropagation() {},
    dataTransfer,
  }, 'copy'), false)
})

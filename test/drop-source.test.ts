import assert from 'node:assert/strict'
import { test } from 'node:test'
import { droppedSourcePath, resolveDroppedSource, sourceDisplayName } from '../src/view/settings/drop-source.ts'

/** 构造模拟 DataTransfer，用于落点来源解析测试。 */
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

test('sourceDisplayName 取最后一段', () => {
  assert.equal(sourceDisplayName('/tmp/供应商台账.csv'), '供应商台账.csv')
  assert.equal(sourceDisplayName('C:\\notes\\合同.md\\'), '合同.md')
})

test('droppedSourcePath 优先用 File.path', () => {
  assert.equal(droppedSourcePath(transfer({ path: '/tmp/供应商台账.csv' })), '/tmp/供应商台账.csv')
})

test('droppedSourcePath 能从 file URI 还原本机路径', () => {
  assert.equal(
    droppedSourcePath(transfer({ uriList: 'file:///tmp/%E4%BE%9B%E5%BA%94%E5%95%86%E5%8F%B0%E8%B4%A6.csv' })),
    '/tmp/供应商台账.csv',
  )
  assert.equal(droppedSourcePath(transfer({ uriList: 'file:///C:/notes/a.csv' })), 'C:/notes/a.csv')
})

test('droppedSourcePath 接受绝对路径形式的 text/plain', () => {
  assert.equal(droppedSourcePath(transfer({ plain: '/Users/me/a.csv' })), '/Users/me/a.csv')
  assert.equal(droppedSourcePath(transfer({ plain: 'C:\\notes\\a.csv' })), 'C:\\notes\\a.csv')
})

test('droppedSourcePath 拒绝只有文件名的拖入项', () => {
  assert.equal(droppedSourcePath(transfer({ name: '供应商台账.csv', plain: '供应商台账.csv' })), '')
})

test('resolveDroppedSource 没有路径时改用 File 本身', () => {
  const dropped = resolveDroppedSource(transfer({ name: '供应商台账.csv' }))
  assert.equal(dropped.kind, 'file')
  if (dropped.kind === 'file') assert.equal(dropped.file.name, '供应商台账.csv')
})

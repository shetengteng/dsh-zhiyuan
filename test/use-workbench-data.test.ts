import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickWorkbenchBaseId } from '../src/client/settings/use-workbench-data.ts'
import type { BaseSummary } from '../src/types.ts'

function summary(id: string, lastUsed = false): BaseSummary {
  return {
    id,
    title: id,
    description: '',
    aliases: [],
    createdAt: 0,
    lastUsedAt: 0,
    categories: [],
    approxDocs: 0,
    lastUsed,
  }
}

test('pickWorkbenchBaseId 当前库仍在列表中则保持选中', () => {
  const list = [summary('keep', true), summary('other')]
  assert.equal(pickWorkbenchBaseId(list, 'other'), 'other')
})

test('pickWorkbenchBaseId 当前库已删除则回退到上次使用', () => {
  const list = [summary('left', true), summary('right')]
  assert.equal(pickWorkbenchBaseId(list, 'gone'), 'left')
})

test('pickWorkbenchBaseId 没有上次使用标记则选第一项', () => {
  const list = [summary('a'), summary('b')]
  assert.equal(pickWorkbenchBaseId(list, 'gone'), 'a')
})

test('pickWorkbenchBaseId 删光后返回空字符串', () => {
  assert.equal(pickWorkbenchBaseId([], 'gone'), '')
})

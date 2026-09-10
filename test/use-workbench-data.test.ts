import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickWorkbenchKbId } from '../src/view/settings/use-workbench-data.ts'
import type { KbSummaryResponse } from '../src/model/response/kb-response.ts'

function summary(id: string, lastUsed = false): KbSummaryResponse {
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

test('pickWorkbenchKbId 当前库仍在列表中则保持选中', () => {
  const list = [summary('keep', true), summary('other')]
  assert.equal(pickWorkbenchKbId(list, 'other'), 'other')
})

test('pickWorkbenchKbId 当前库已删除则回退到上次使用', () => {
  const list = [summary('left', true), summary('right')]
  assert.equal(pickWorkbenchKbId(list, 'gone'), 'left')
})

test('pickWorkbenchKbId 没有上次使用标记则选第一项', () => {
  const list = [summary('a'), summary('b')]
  assert.equal(pickWorkbenchKbId(list, 'gone'), 'a')
})

test('pickWorkbenchKbId 删光后返回空字符串', () => {
  assert.equal(pickWorkbenchKbId([], 'gone'), '')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseReadEntry } from '../src/client/host-payload.ts'

test('新版 Host preview payload 按原样通过', () => {
  const payload = {
    path: 'notes/a.md',
    text: '# 标题',
    format: 'markdown' as const,
    view: 'tree' as const,
    windowStartLine: 1,
    windowEndLine: 1,
    truncation: 'none' as const,
    totalChars: 4,
    previewStatus: 'ready' as const,
    capabilities: { canEdit: true },
  }
  assert.equal(parseReadEntry(payload), payload)
})

test('旧 Host 的 Markdown read 响应仍能打开预览', () => {
  const preview = parseReadEntry({ path: 'notes/a.md', text: '# 标题\n正文' }, {
    view: 'search-hit',
    matchLine: 2,
  })

  assert.deepEqual(preview, {
    path: 'notes/a.md',
    text: '# 标题\n正文',
    format: 'markdown',
    view: 'search-hit',
    windowStartLine: 1,
    windowEndLine: 2,
    focusLine: 2,
    truncation: 'none',
    totalChars: 7,
    previewStatus: 'ready',
    capabilities: { canEdit: true },
  })
})

test('不完整的 preview payload 不会被当成 Markdown 正文', () => {
  assert.throws(() => parseReadEntry({ path: 'notes/a.md' }), /预览数据无效/)
})

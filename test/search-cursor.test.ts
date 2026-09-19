import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KbError } from '../src/model/error/kb-error.ts'
import { SEARCH_CURSOR_MAX_LENGTH } from '../src/model/search-limits.ts'
import { cursorQueryFromSearch, decodeSearchCursor, encodeSearchCursor } from '../src/service/search/pagination.ts'
import type { SearchCursorPayload } from '../src/model/context/search-cursor.ts'

/** 断言抛出指定错误码的 KbError。 */
function throwsCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KbError && error.code === code
}

function encodeRaw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

const filesCursor: SearchCursorPayload = {
  version: 4,
  scope: 'files',
  query: { kbId: 'kb-1', terms: ['供应商'], aliases: ['供货'] },
  position: { fileIndex: 3 },
}

const hitsCursor: SearchCursorPayload = {
  version: 4,
  scope: 'hits',
  query: { kbId: 'kb-1', terms: ['验收'], aliases: [], category: '会议', path: '会议/纪要.md' },
  position: { hitIndex: 2 },
}

test('搜索游标：文件概览与文件详情两种作用域都能往返', () => {
  assert.deepEqual(decodeSearchCursor(encodeSearchCursor(filesCursor)), filesCursor)
  assert.deepEqual(decodeSearchCursor(encodeSearchCursor(hitsCursor)), hitsCursor)
  // base64url 不做分隔符转义，可直接作为 URL 查询参数
  assert.match(encodeSearchCursor(filesCursor), /^[A-Za-z0-9_-]+$/u)
})

test('搜索游标：编码前拒绝结构非法的载荷', () => {
  const rejected: unknown[] = [
    { ...filesCursor, version: 3 },
    { ...filesCursor, scope: 'entries' },
    { version: 4, scope: 'files', query: { kbId: '', terms: ['a'], aliases: [] }, position: { fileIndex: 0 } },
    { version: 4, scope: 'files', query: { kbId: 'kb-1', terms: [], aliases: [] }, position: { fileIndex: 0 } },
    { version: 4, scope: 'files', query: { kbId: 'kb-1', terms: [' '], aliases: [] }, position: { fileIndex: 0 } },
    { version: 4, scope: 'files', query: { kbId: 'kb-1', terms: ['a'], aliases: [] }, position: { fileIndex: -1 } },
    { version: 4, scope: 'files', query: { kbId: 'kb-1', terms: ['a'], aliases: [] }, position: { fileIndex: 0, hitIndex: 1 } },
    { version: 4, scope: 'files', query: { kbId: 'kb-1', terms: ['a'], aliases: [], path: 'a.md' }, position: { fileIndex: 0 } },
    { version: 4, scope: 'hits', query: { kbId: 'kb-1', terms: ['a'], aliases: [] }, position: { hitIndex: 0 } },
    { version: 4, scope: 'hits', query: { kbId: 'kb-1', terms: ['a'], aliases: [], category: '' , path: 'a.md' }, position: { hitIndex: 0 } },
    { version: 4, scope: 'hits', query: filesCursor.query, position: { hitIndex: 0.5 } },
  ]
  for (const payload of rejected) {
    assert.throws(() => encodeSearchCursor(payload as SearchCursorPayload), throwsCode('invalid_field'))
  }
})

test('搜索游标：解码拒绝非法字符、超长、坏 JSON 与非法结构', () => {
  assert.throws(() => decodeSearchCursor(''), throwsCode('invalid_field'))
  assert.throws(() => decodeSearchCursor('a+b/c='), throwsCode('invalid_field'))
  assert.throws(() => decodeSearchCursor('a'.repeat(SEARCH_CURSOR_MAX_LENGTH + 1)), throwsCode('invalid_field'))
  // 合法 base64url 但不是 JSON
  assert.throws(() => decodeSearchCursor(Buffer.from('not json').toString('base64url')), throwsCode('invalid_field'))
  // 合法 JSON 但载荷结构不符合 v4
  assert.throws(() => decodeSearchCursor(encodeRaw({ version: 4 })), throwsCode('invalid_field'))
  assert.throws(() => decodeSearchCursor(encodeRaw({ ...hitsCursor, position: { hitIndex: -1 } })), throwsCode('invalid_field'))
  // 长度上限内容必须仍是合法游标，超长前缀不因长度通过而被接受
  assert.throws(() => decodeSearchCursor('a'.repeat(SEARCH_CURSOR_MAX_LENGTH)), throwsCode('invalid_field'))
})

test('维护搜索游标查询上下文时复制数组，避免外部改动污染游标', () => {
  const terms = ['供应商']
  const aliases = ['供货']
  const query = { terms, aliases }
  const withoutScope = cursorQueryFromSearch(query, 'kb-1')
  assert.deepEqual(withoutScope, { kbId: 'kb-1', terms: ['供应商'], aliases: ['供货'] })
  terms.push('验收')
  aliases.push('收货')
  assert.deepEqual(withoutScope.terms, ['供应商'])
  assert.deepEqual(withoutScope.aliases, ['供货'])

  assert.deepEqual(cursorQueryFromSearch(query, 'kb-1', '会议', '会议/纪要.md'), {
    kbId: 'kb-1',
    terms: ['供应商', '验收'],
    aliases: ['供货', '收货'],
    category: '会议',
    path: '会议/纪要.md',
  })
  // 空类目与空路径不写入游标上下文
  assert.equal('category' in cursorQueryFromSearch(query, 'kb-1', '', ''), false)
})
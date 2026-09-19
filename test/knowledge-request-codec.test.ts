import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  asRecord,
  decodeImportOperation,
  decodeKnowledgeOperation,
  hasField,
  optionalBoolean,
  optionalPositiveInteger,
  optionalString,
  optionalStringArray,
  readPreviewOptions,
  requireString,
} from '../src/controller/rpc/knowledge-request-codec.ts'
import { TABLE_EDITOR_PAGE_SIZE } from '../src/model/constants.ts'
import { KbError } from '../src/model/error/kb-error.ts'

/** 断言抛出指定错误码的 KbError。 */
function throwsCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KbError && error.code === code
}

test('asRecord 只接受非数组对象，hasField 区分缺省与显式 undefined', () => {
  assert.deepEqual(asRecord({ op: 'list' }), { op: 'list' })
  assert.throws(() => asRecord(null), throwsCode('invalid_field'))
  assert.throws(() => asRecord([]), throwsCode('invalid_field'))
  assert.throws(() => asRecord('op'), throwsCode('invalid_field'))
  assert.throws(() => asRecord(7), throwsCode('invalid_field'))

  assert.equal(hasField({ value: undefined }, 'value'), true)
  assert.equal(hasField({}, 'value'), false)
})

test('标量字段收窄：必填缺失、类型错误与合法取值', () => {
  assert.equal(requireString({ op: 'list' }, 'op'), 'list')
  assert.throws(() => requireString({}, 'op'), throwsCode('missing_field'))
  assert.throws(() => requireString({ op: 1 }, 'op'), throwsCode('invalid_field'))

  assert.equal(optionalString({}, 'title'), undefined)
  assert.equal(optionalString({ title: '合同' }, 'title'), '合同')
  assert.throws(() => optionalString({ title: null }, 'title'), throwsCode('invalid_field'))

  assert.equal(optionalStringArray({}, 'aliases'), undefined)
  assert.deepEqual(optionalStringArray({ aliases: ['合同', '供应商'] }, 'aliases'), ['合同', '供应商'])
  assert.throws(() => optionalStringArray({ aliases: '合同' }, 'aliases'), throwsCode('invalid_field'))
  assert.throws(() => optionalStringArray({ aliases: ['合同', 2] }, 'aliases'), throwsCode('invalid_field'))

  assert.equal(optionalBoolean({}, 'confirm', true), true)
  assert.equal(optionalBoolean({ confirm: false }, 'confirm', true), false)
  assert.throws(() => optionalBoolean({ confirm: 'false' }, 'confirm', false), throwsCode('invalid_field'))

  assert.equal(optionalPositiveInteger({}, 'limit'), undefined)
  assert.equal(optionalPositiveInteger({ limit: 3 }, 'limit'), 3)
  assert.throws(() => optionalPositiveInteger({ limit: 0 }, 'limit'), throwsCode('invalid_field'))
  assert.throws(() => optionalPositiveInteger({ limit: 1.5 }, 'limit'), throwsCode('invalid_field'))
  assert.throws(() => optionalPositiveInteger({ limit: '3' }, 'limit'), throwsCode('invalid_field'))
})

test('readPreviewOptions：树形可编辑，搜索命中必须有行号且不能编辑', () => {
  assert.deepEqual(readPreviewOptions({}), { readMode: 'preview' })
  assert.deepEqual(readPreviewOptions({ view: 'tree', readMode: 'edit' }), { view: 'tree', readMode: 'edit' })
  assert.deepEqual(readPreviewOptions({ view: 'search-hit', matchLine: 3 }), {
    view: 'search-hit',
    readMode: 'preview',
    matchLine: 3,
    matchColumnByte: undefined,
    sourceFingerprint: undefined,
  })
  assert.deepEqual(
    readPreviewOptions({ view: 'search-hit', matchLine: 3, matchColumnByte: 4, sourceFingerprint: 'a'.repeat(128) }),
    { view: 'search-hit', readMode: 'preview', matchLine: 3, matchColumnByte: 4, sourceFingerprint: 'a'.repeat(128) },
  )

  assert.throws(() => readPreviewOptions({ readMode: 'write' }), throwsCode('invalid_preview'))
  assert.throws(() => readPreviewOptions({ view: 'raw' }), throwsCode('invalid_preview'))
  assert.throws(() => readPreviewOptions({ view: 'search-hit' }), throwsCode('invalid_preview'))
  assert.throws(
    () => readPreviewOptions({ view: 'search-hit', matchLine: 3, readMode: 'edit' }),
    throwsCode('invalid_preview'),
  )
  assert.throws(
    () => readPreviewOptions({ view: 'search-hit', matchLine: 3, sourceFingerprint: 'a'.repeat(129) }),
    throwsCode('invalid_preview'),
  )
})

test('decodeImportOperation：路径形态补默认值，字节形态要求 sourceName', () => {
  assert.deepEqual(decodeImportOperation({ kbId: 'kb-1', sourcePath: '/tmp/a.md', destCategory: '' }), {
    op: 'import',
    kbId: 'kb-1',
    sourcePath: '/tmp/a.md',
    destCategory: '',
    preserveTree: false,
    createMissing: true,
  })
  assert.deepEqual(
    decodeImportOperation({ kbId: 'kb-1', sourcePath: '/tmp/dir', destCategory: '归档', preserveTree: true, createMissing: false }),
    { op: 'import', kbId: 'kb-1', sourcePath: '/tmp/dir', destCategory: '归档', preserveTree: true, createMissing: false },
  )
  assert.throws(() => decodeImportOperation({ kbId: 'kb-1', destCategory: '' }), throwsCode('missing_field'))

  assert.deepEqual(
    decodeImportOperation({ kbId: 'kb-1', destCategory: '表格', sourceName: '台账.csv', sourceBase64: 'AA==' }),
    { op: 'import', kbId: 'kb-1', destCategory: '表格', sourceName: '台账.csv', sourceBase64: 'AA==', preserveTree: false, createMissing: true },
  )
  assert.throws(
    () => decodeImportOperation({ kbId: 'kb-1', destCategory: '表格', sourceBase64: 'AA==' }),
    throwsCode('missing_field'),
  )
})

test('decodeKnowledgeOperation：各操作收窄，未知名与其他非法值报错', () => {
  assert.deepEqual(decodeKnowledgeOperation({ op: 'list' }), { op: 'list' })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'create', title: '合同库', description: '公司合同' }), {
    op: 'create',
    title: '合同库',
    description: '公司合同',
    aliases: [],
  })
  assert.throws(() => decodeKnowledgeOperation({ op: 'create', title: '合同库' }), throwsCode('missing_field'))
  assert.deepEqual(decodeKnowledgeOperation({ op: 'update', id: 'kb-1' }), { op: 'update', id: 'kb-1' })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'deleteKb', id: 'kb-1' }), { op: 'deleteKb', id: 'kb-1', confirm: false })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'tree', id: 'kb-1' }), { op: 'tree', id: 'kb-1' })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'read', id: 'kb-1', path: 'a.md' }), {
    op: 'read',
    id: 'kb-1',
    path: 'a.md',
    readMode: 'preview',
  })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'readPage', id: 'kb-1', path: 'a.csv' }), {
    op: 'readPage',
    id: 'kb-1',
    path: 'a.csv',
    startRow: 1,
    pageSize: TABLE_EDITOR_PAGE_SIZE,
  })
  assert.deepEqual(
    decodeKnowledgeOperation({ op: 'write', id: 'kb-1', path: 'a.md', change: { kind: 'text', text: '更新' } }),
    { op: 'write', id: 'kb-1', path: 'a.md', change: { kind: 'text', text: '更新' } },
  )
  assert.throws(
    () => decodeKnowledgeOperation({ op: 'write', id: 'kb-1', path: 'a.md', change: { kind: 'patch' } }),
    throwsCode('invalid_field'),
  )
  assert.deepEqual(decodeKnowledgeOperation({ op: 'deleteEntry', id: 'kb-1', path: 'a.md' }), {
    op: 'deleteEntry',
    id: 'kb-1',
    path: 'a.md',
    confirm: false,
  })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'pick', kind: 'dir' }), { op: 'pick', kind: 'dir' })
  assert.throws(() => decodeKnowledgeOperation({ op: 'pick', kind: 'folder' }), throwsCode('invalid_field'))
  assert.deepEqual(decodeKnowledgeOperation({ op: 'prefs' }), { op: 'prefs' })
  assert.deepEqual(decodeKnowledgeOperation({ op: 'setPrefs', maxFileBytes: 1024 }), { op: 'setPrefs', maxFileBytes: 1024 })
  assert.throws(() => decodeKnowledgeOperation({ op: 'rebuild' }), throwsCode('unknown_op'))
  assert.throws(() => decodeKnowledgeOperation('list'), throwsCode('invalid_field'))
})

test('decodeKnowledgeOperation：续页搜索只允许 cursor 与 limit', () => {
  assert.deepEqual(decodeKnowledgeOperation({ op: 'search', kbId: 'kb-1', query: '供应商' }), {
    op: 'search',
    kbId: 'kb-1',
    query: '供应商',
  })
  assert.deepEqual(
    decodeKnowledgeOperation({ op: 'search', kbId: 'kb-1', query: '供应商', aliases: ['供货'], category: '会议', path: 'a.md', limit: 5 }),
    { op: 'search', kbId: 'kb-1', query: '供应商', aliases: ['供货'], category: '会议', path: 'a.md', limit: 5 },
  )
  assert.deepEqual(decodeKnowledgeOperation({ op: 'search', cursor: 'cursor-1', limit: 5 }), {
    op: 'search',
    cursor: 'cursor-1',
    limit: 5,
  })
  assert.throws(
    () => decodeKnowledgeOperation({ op: 'search', cursor: 'cursor-1', kbId: 'kb-1' }),
    throwsCode('invalid_field'),
  )
  assert.throws(() => decodeKnowledgeOperation({ op: 'search', cursor: 'cursor-1', path: 'a.md' }), throwsCode('invalid_field'))
  assert.throws(() => decodeKnowledgeOperation({ op: 'search', query: '供应商' }), throwsCode('missing_field'))
})
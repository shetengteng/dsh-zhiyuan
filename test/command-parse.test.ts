import assert from 'node:assert/strict'
import { test } from 'node:test'
import { flagBool, flagString, parseFlags, splitAliases, tokenize } from '../src/controller/command/kb-command-parser.ts'

test('tokenize：空白、双引号、单引号、未闭合当普通词', () => {
  assert.deepEqual(tokenize(''), [])
  assert.deepEqual(tokenize('  import  /tmp/a.md  '), ['import', '/tmp/a.md'])
  assert.deepEqual(tokenize('import "/tmp/合同 2024.md" --kb work'), [
    'import',
    '/tmp/合同 2024.md',
    '--kb',
    'work',
  ])
  assert.deepEqual(tokenize("import '/tmp/a b.md' --to 合同"), ['import', '/tmp/a b.md', '--to', '合同'])
  assert.deepEqual(tokenize('call {"op":"list"}'), ['call', '{"op":"list"}'])
})

test('parseFlags：首个非 flag 是 sub，其余进 rest / flags', () => {
  assert.deepEqual(parseFlags([]), { sub: '', rest: [], flags: {} })
  assert.deepEqual(parseFlags(['status']), { sub: 'status', rest: [], flags: {} })
  const parsed = parseFlags(['import', '/tmp/a.md', '--kb', 'work', '--to', '合同/2024', '--preserve-tree'])
  assert.equal(parsed.sub, 'import')
  assert.deepEqual(parsed.rest, ['/tmp/a.md'])
  assert.equal(parsed.flags.kb, 'work')
  assert.equal(parsed.flags.to, '合同/2024')
  assert.equal(parsed.flags['preserve-tree'], true)
})

test('parseFlags：下一个也是 -- 则当前 flag 为 true；连续布尔 flag', () => {
  const parsed = parseFlags(['import', '--root', '--no-create', '--kb', 'work'])
  assert.equal(parsed.flags.root, true)
  assert.equal(parsed.flags['no-create'], true)
  assert.equal(parsed.flags.kb, 'work')
})

test('flagString 只认字符串；布尔 flag 视为未提供', () => {
  assert.equal(flagString({ path: '/tmp/a.md' }, 'path'), '/tmp/a.md')
  assert.equal(flagString({ path: true }, 'path'), undefined)
  assert.equal(flagString({}, 'path'), undefined)
})

test('flagBool：true/false 字面量、字符串、缺省回退', () => {
  assert.equal(flagBool({ root: true }, 'root'), true)
  assert.equal(flagBool({ root: 'true' }, 'root'), true)
  assert.equal(flagBool({ root: false }, 'root'), false)
  assert.equal(flagBool({ root: 'false' }, 'root'), false)
  assert.equal(flagBool({}, 'root'), false)
  assert.equal(flagBool({}, 'root', true), true)
  assert.equal(flagBool({ root: 'yes' }, 'root', false), false)
})

test('splitAliases：空、英文逗号、中文逗号、去空白', () => {
  assert.deepEqual(splitAliases(undefined), [])
  assert.deepEqual(splitAliases(''), [])
  assert.deepEqual(splitAliases('工作,公司, 合同 '), ['工作', '公司', '合同'])
  assert.deepEqual(splitAliases('解约，termination，  '), ['解约', 'termination'])
})

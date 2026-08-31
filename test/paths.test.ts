import assert from 'node:assert/strict'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { assertInside, assertNoSymlinkEscape, expandUserPath, resolveDest, resolveEntry, setDataRootForTest } from '../src/paths.ts'
import { KbError } from '../src/types.ts'

const root = '/tmp/zhiyuan-path-root'

test('合法类目：合同/2024、contracts、_inbox、空', () => {
  setDataRootForTest(root)
  assert.equal(resolveDest(root, 'work', '合同/2024').relative, '合同/2024')
  assert.equal(resolveDest(root, 'work', 'contracts').relative, 'contracts')
  assert.equal(resolveDest(root, 'work', '_inbox').relative, '_inbox')
  assert.equal(resolveDest(root, 'work', '').relative, '')
})

test('去空段与首尾斜杠', () => {
  assert.equal(resolveDest(root, 'work', '合同//2024/').relative, '合同/2024')
})

test('深度 > 4 只提示不禁止', () => {
  const dest = resolveDest(root, 'work', 'a/b/c/d/e')
  assert.equal(dest.deep, true)
  assert.equal(dest.relative, 'a/b/c/d/e')
})

test('拒绝 ..、绝对路径、盘符逃出', () => {
  assert.throws(() => resolveDest(root, 'work', '../life'), KbError)
  assert.throws(() => resolveDest(root, 'work', '/etc'), KbError)
  assert.throws(() => resolveDest(root, 'work', 'work/../../life'), KbError)
})

test('解析后仍在 bases/<id>/ 下', () => {
  const dest = resolveDest(root, 'work', '合同/2024')
  assert.ok(dest.absolute.includes(`${join('bases', 'work')}`))
  assert.ok(!dest.absolute.includes('life'))
})

test('expandUserPath 展开 ~；resolveEntry 与 resolveDest 同根', () => {
  const home = process.env.HOME || ''
  if (home) {
    assert.equal(expandUserPath('~'), home)
    assert.ok(expandUserPath('~/docs/a.md').startsWith(home))
  }
  assert.equal(expandUserPath('/tmp/a.md'), '/tmp/a.md')
  assert.equal(resolveEntry(root, 'work', '合同/2024/a.md'), resolveDest(root, 'work', '合同/2024/a.md').absolute)
})

test('assertInside 拒绝逃出', () => {
  assert.throws(() => assertInside('/tmp/root', '/tmp/other'), KbError)
  assert.equal(assertInside('/tmp/root', '/tmp/root/a'), '/tmp/root/a')
})

test('符号链接逃出被拒绝', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zy-link-'))
  const inside = join(dir, 'bases', 'work')
  const outside = join(dir, 'outside')
  await import('node:fs/promises').then((fs) => fs.mkdir(inside, { recursive: true }))
  await import('node:fs/promises').then((fs) => fs.mkdir(outside, { recursive: true }))
  const link = join(inside, 'escape')
  await symlink(outside, link)
  assert.throws(() => assertNoSymlinkEscape(inside, link), KbError)
  await rm(dir, { recursive: true, force: true })
})

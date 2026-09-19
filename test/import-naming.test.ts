import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  isImportFailureCode,
  looksBareName,
  missingSourceMessage,
  outputRelativePath,
  relativeSourcePath,
  uniqueName,
} from '../src/service/kb/import/import-naming.ts'

test('uniqueName：同名文件依次追加 -2、-3，并保留扩展名', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-naming-'))
  try {
    assert.equal(uniqueName(root, '台账.csv'), '台账.csv')
    await writeFile(join(root, '台账.csv'), 'x')
    assert.equal(uniqueName(root, '台账.csv'), '台账-2.csv')
    await writeFile(join(root, '台账-2.csv'), 'x')
    assert.equal(uniqueName(root, '台账.csv'), '台账-3.csv')

    assert.equal(uniqueName(root, 'README'), 'README')
    await writeFile(join(root, 'README'), 'x')
    assert.equal(uniqueName(root, 'README'), 'README-2')

    // 多个点号只替换最后一段扩展名
    await writeFile(join(root, '合同.2026.md'), 'x')
    assert.equal(uniqueName(root, '合同.2026.md'), '合同.2026-2.md')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('looksBareName：只有纯文件名才判为浏览器拖拽', () => {
  assert.equal(looksBareName('a.md'), true)
  assert.equal(looksBareName('  供应商合同.md  '), true)
  assert.equal(looksBareName('./a.md'), false)
  assert.equal(looksBareName('会议/a.md'), false)
  assert.equal(looksBareName('会议\\a.md'), false)
  assert.equal(looksBareName('/tmp/a.md'), false)
  assert.equal(looksBareName('~/a.md'), false)
  assert.equal(looksBareName(''), false)
  assert.equal(looksBareName('   '), false)
})

test('missingSourceMessage：纯文件名给出拖拽提示，绝对路径保持原样', () => {
  assert.match(missingSourceMessage('a.md'), /导入弹框中的拖拽区域/)
  assert.equal(missingSourceMessage('/tmp/missing.md'), '源路径不存在：/tmp/missing.md')
})

test('relativeSourcePath 与 outputRelativePath 决定落点相对路径', () => {
  const sourceRoot = join('/tmp', '来源')
  assert.equal(relativeSourcePath(sourceRoot, join(sourceRoot, '会议', '纪要.md'), false), '纪要.md')
  assert.equal(relativeSourcePath(sourceRoot, join(sourceRoot, '会议', '纪要.md'), true), '会议/纪要.md')

  assert.equal(outputRelativePath('纪要.md', '纪要.md', '纪要.md'), '纪要.md')
  assert.equal(outputRelativePath('会议/纪要.md', '纪要.md', '纪要.md'), '会议/纪要.md')
  assert.equal(outputRelativePath('会议/纪要.md', '纪要.md', '纪要.csv'), '会议/纪要.csv')
})

test('isImportFailureCode 只认可写入结果的单文件失败码', () => {
  for (const code of [
    'ext_denied',
    'file_too_large',
    'quota',
    'path_escape',
    'csv_encoding_invalid',
    'csv_control_character',
    'csv_line_too_long',
    'encoding_unsupported',
    'io_failed',
  ]) {
    assert.equal(isImportFailureCode(code), true, code)
  }
  for (const code of ['csv_parse_invalid', 'csv_patch_invalid', 'kb_missing', 'not_found', 'unknown_op']) {
    assert.equal(isImportFailureCode(code), false, code)
  }
})

test('导入命名：目录不存在时 uniqueName 仍返回原名', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zy-naming-missing-'))
  try {
    await mkdir(join(root, '空'), { recursive: true })
    assert.equal(uniqueName(join(root, '不存在'), 'a.md'), 'a.md')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
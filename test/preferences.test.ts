import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_MAX_FILE_BYTES, DEFAULT_MAX_KB_BYTES } from '../src/model/constants.ts'
import { KbError } from '../src/model/error/kb-error.ts'
import { FileCatalogRepository } from '../src/repository/kb/file-catalog-repository.ts'
import { createKb } from '../src/service/kb/kb-lifecycle.ts'
import { getPreferences, updatePreferences } from '../src/service/kb/preferences.ts'

const catalogRepository = new FileCatalogRepository()

/** 断言抛出指定错误码的 KbError。 */
function throwsCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KbError && error.code === code
}

async function sandbox(prefix = 'zy-prefs-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

test('偏好：空 catalog 返回默认额度，建库后自动成为默认库', async () => {
  const root = await sandbox()
  try {
    assert.deepEqual(await getPreferences(catalogRepository, root), {
      defaultKbId: '',
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxKbBytes: DEFAULT_MAX_KB_BYTES,
    })

    const card = await createKb(catalogRepository, root, { title: '工作库', description: '合同' })
    assert.deepEqual(await getPreferences(catalogRepository, root), {
      defaultKbId: card.id,
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxKbBytes: DEFAULT_MAX_KB_BYTES,
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('偏好：部分更新只改传入字段并写回 catalog', async () => {
  const root = await sandbox()
  try {
    const card = await createKb(catalogRepository, root, { title: '工作库', description: '合同' })
    const updated = await updatePreferences(catalogRepository, root, { maxFileBytes: 1024 })
    assert.deepEqual(updated, { defaultKbId: card.id, maxFileBytes: 1024, maxKbBytes: DEFAULT_MAX_KB_BYTES })
    assert.deepEqual(await getPreferences(catalogRepository, root), updated)

    const limited = await updatePreferences(catalogRepository, root, { maxKbBytes: 2048, defaultKbId: card.id })
    assert.deepEqual(limited, { defaultKbId: card.id, maxFileBytes: 1024, maxKbBytes: 2048 })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('偏好：拒绝不存在的默认库、倒挂额度和超出上限的额度', async () => {
  const root = await sandbox()
  try {
    await assert.rejects(
      updatePreferences(catalogRepository, root, { defaultKbId: 'kb-不存在' }),
      throwsCode('kb_missing'),
    )
    await assert.rejects(
      updatePreferences(catalogRepository, root, { maxFileBytes: 2048, maxKbBytes: 1024 }),
      throwsCode('quota'),
    )
    await assert.rejects(
      updatePreferences(catalogRepository, root, { maxFileBytes: 1024 * 1024 * 1024 + 1 }),
      throwsCode('quota'),
    )
    // 被拒的更新不落盘
    assert.equal((await getPreferences(catalogRepository, root)).maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('偏好：默认库只要目录存在即可接受，即使 catalog 没有卡片', async () => {
  const root = await sandbox()
  try {
    await mkdir(join(root, 'kbs', 'orphan-kb'), { recursive: true })
    const updated = await updatePreferences(catalogRepository, root, { defaultKbId: 'orphan-kb' })
    assert.equal(updated.defaultKbId, 'orphan-kb')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
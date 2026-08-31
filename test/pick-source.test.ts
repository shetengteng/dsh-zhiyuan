import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  linuxArgs,
  macArgs,
  normalizePickedPath,
  pickSource,
  winArgs,
} from '../src/pick-source.ts'
import { KbError } from '../src/types.ts'

test('normalizePickedPath 去换行和尾斜杠', () => {
  assert.equal(normalizePickedPath('/tmp/合同.md\n'), '/tmp/合同.md')
  assert.equal(normalizePickedPath('/tmp/notes/\n'), '/tmp/notes')
  assert.equal(normalizePickedPath('C:\\notes\\\r\n'), 'C:\\notes')
  assert.equal(normalizePickedPath('/'), '/')
  assert.equal(normalizePickedPath('  '), '')
})

test('各平台参数：文件走选文件，目录走选目录', () => {
  assert.match(macArgs('file').join('\n'), /choose file/)
  assert.match(macArgs('dir').join('\n'), /choose folder/)
  assert.match(winArgs('file').join('\n'), /OpenFileDialog/)
  assert.match(winArgs('dir').join('\n'), /FolderBrowserDialog/)
  assert.ok(linuxArgs('file').includes('--file-selection'))
  assert.ok(linuxArgs('dir').includes('--directory'))
})

test('pickSource：有路径返回 path；空输出视为取消', async () => {
  const picked = await pickSource('file', {
    platform: 'darwin',
    exec: async (file, args) => {
      assert.equal(file, 'osascript')
      assert.match(args.join('\n'), /choose file/)
      return { stdout: '/Users/me/合同.md\n', stderr: '' }
    },
  })
  assert.deepEqual(picked, { path: '/Users/me/合同.md' })
  const cancelled = await pickSource('dir', {
    platform: 'linux',
    exec: async () => ({ stdout: '\n', stderr: '' }),
  })
  assert.deepEqual(cancelled, { cancelled: true })
})

test('pickSource：zenity 取消码 / 缺二进制', async () => {
  const cancelled = await pickSource('file', {
    platform: 'linux',
    exec: async () => {
      const error = Object.assign(new Error('cancel'), { code: 1 })
      throw error
    },
  })
  assert.deepEqual(cancelled, { cancelled: true })
  await assert.rejects(
    () => pickSource('file', {
      platform: 'linux',
      exec: async () => {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      },
    }),
    (error: unknown) => error instanceof KbError && /选文件对话框/.test(error.message),
  )
})

test('pickSource：Windows 走 powershell', async () => {
  const picked = await pickSource('dir', {
    platform: 'win32',
    exec: async (file, args) => {
      assert.equal(file, 'powershell.exe')
      assert.ok(args.includes('-STA'))
      assert.match(args.join('\n'), /FolderBrowserDialog/)
      return { stdout: 'D:\\notes\\\n', stderr: '' }
    },
  })
  assert.deepEqual(picked, { path: 'D:\\notes' })
})

import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import { contentRegistry } from './content/host-api.ts'
import { KbError } from './types.ts'

export type PickKind = 'file' | 'dir'
export type PickResult = { path: string } | { cancelled: true }

export type ExecFileFn = (
  file: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>

const defaultExec: ExecFileFn = (file, args) =>
  promisify(execFileCb)(file, args, { windowsHide: true, encoding: 'utf8' })

export function normalizePickedPath(raw: string): string {
  let path = raw.replace(/\r?\n$/g, '').trim()
  const isWindowsDriveRoot = /^[A-Za-z]:[\\/]$/.test(path)
  if (path.length > 1 && !isWindowsDriveRoot && (path.endsWith('/') || path.endsWith('\\'))) path = path.slice(0, -1)
  return path
}

export function macArgs(kind: PickKind): string[] {
  const prompt = kind === 'dir' ? '选择要导入的文件夹' : '选择要导入的文件'
  const choose = kind === 'dir' ? 'choose folder' : 'choose file'
  return ['-e', `try\nPOSIX path of (${choose} with prompt "${prompt}")\non error number -128\n""\nend try`]
}

export function winArgs(kind: PickKind): string[] {
  const utf8 = '$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; '
  const sourceFilter = `可导入文件|${contentRegistry.sourceExtensions().map((extension) => `*${extension}`).join(';')}|All|*.*`
  const script = kind === 'dir'
    ? `${utf8}Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '选择要导入的文件夹'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.SelectedPath }`
    : `${utf8}Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = '${sourceFilter}'; $d.Title = '选择要导入的文件'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileName }`
  return ['-NoProfile', '-STA', '-Command', script]
}

export function linuxArgs(kind: PickKind): string[] {
  return kind === 'dir'
    ? ['--file-selection', '--directory', '--title=选择要导入的文件夹']
    : ['--file-selection', '--title=选择要导入的文件']
}

function invokeArgs(kind: PickKind, platform: NodeJS.Platform): { file: string; args: string[] } {
  if (platform === 'darwin') return { file: 'osascript', args: macArgs(kind) }
  if (platform === 'win32') return { file: 'powershell.exe', args: winArgs(kind) }
  if (platform === 'linux') return { file: 'zenity', args: linuxArgs(kind) }
  throw new KbError('not_found', `当前平台 ${platform} 暂不支持系统文件选择器，请使用拖拽导入`)
}

function isMissingBin(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT')
}

function isCancelExit(error: unknown): boolean {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined
  return code === 1 || code === 128
}

export async function pickSource(
  kind: PickKind,
  opts?: { exec?: ExecFileFn; platform?: NodeJS.Platform },
): Promise<PickResult> {
  const exec = opts?.exec ?? defaultExec
  const platform = opts?.platform ?? process.platform
  const { file, args } = invokeArgs(kind, platform)
  try {
    const { stdout } = await exec(file, args)
    const path = normalizePickedPath(stdout)
    if (!path) return { cancelled: true }
    return { path }
  } catch (error) {
    if (isMissingBin(error)) {
      throw new KbError('not_found', '本机没有可用的选文件对话框，请使用拖拽区域，或检查系统文件选择器')
    }
    if (isCancelExit(error)) return { cancelled: true }
    throw error instanceof Error ? error : new Error(String(error))
  }
}

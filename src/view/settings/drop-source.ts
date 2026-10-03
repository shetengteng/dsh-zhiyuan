/** 落点来源解析：把拖入项还原为本机路径或 File 对象，并提供 base64 读取。 */
import { droppedFile, isDroppedDirectory, type DroppedFile } from './drag-utils.ts'

export type DroppedSource =
  | { kind: 'path'; path: string }
  | { kind: 'file'; file: File }
  | { kind: 'directory' }
  | { kind: 'empty' }

export function sourceDisplayName(sourcePath: string): string {
  const trimmedPath = sourcePath.replace(/[\\/]+$/, '')
  return trimmedPath.split(/[\\/]/).pop() || trimmedPath
}

function localPathFromUri(rawUri: string): string {
  try {
    const uri = new URL(rawUri)
    if (uri.protocol !== 'file:') return ''
    const decodedPath = decodeURIComponent(uri.pathname)
    if (uri.hostname && uri.hostname !== 'localhost') return `//${uri.hostname}${decodedPath}`
    return /^\/[A-Za-z]:\//.test(decodedPath) ? decodedPath.slice(1) : decodedPath
  } catch {
    return ''
  }
}

function localPathFromPlain(text: string): string {
  const trimmed = text.trim()
  if (!trimmed || /[\r\n]/.test(trimmed)) return ''
  if (trimmed.startsWith('file:')) return localPathFromUri(trimmed)
  if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\')) return trimmed
  return ''
}

function firstUri(raw: string): string {
  return raw.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#')) ?? ''
}

export function droppedSourcePath(dataTransfer: DataTransfer | null): string {
  if (!dataTransfer) return ''
  const dropped: DroppedFile | null = droppedFile(dataTransfer)
  const filePath = dropped?.path?.trim()
  if (filePath) return filePath
  const fromUri = localPathFromUri(firstUri(dataTransfer.getData('text/uri-list')))
  if (fromUri) return fromUri
  return localPathFromPlain(dataTransfer.getData('text/plain'))
}

export function resolveDroppedSource(dataTransfer: DataTransfer | null): DroppedSource {
  if (!dataTransfer) return { kind: 'empty' }
  const path = droppedSourcePath(dataTransfer)
  if (path) return { kind: 'path', path }
  if (isDroppedDirectory(dataTransfer)) return { kind: 'directory' }
  const file = droppedFile(dataTransfer)
  if (file) return { kind: 'file', file }
  return { kind: 'empty' }
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

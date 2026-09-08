type DroppedFile = File & { path?: string }

export type FileDragEvent = {
  preventDefault: () => void
  stopPropagation: () => void
  dataTransfer: DataTransfer | null
}

export type DroppedSource =
  | { kind: 'path'; path: string }
  | { kind: 'file'; file: File }
  | { kind: 'directory' }
  | { kind: 'empty' }

const FILE_DRAG_TYPES = new Set(['Files', 'application/x-moz-file', 'public.file-url', 'text/uri-list'])

export function sourceDisplayName(sourcePath: string): string {
  const trimmedPath = sourcePath.replace(/[\\/]+$/, '')
  return trimmedPath.split(/[\\/]/).pop() || trimmedPath
}

export function listDragTypes(dataTransfer: DataTransfer): string[] {
  const types = dataTransfer.types
  if (!types) return []
  const listed: string[] = []
  for (let index = 0; index < types.length; index += 1) {
    const value = types[index]
    if (typeof value === 'string') listed.push(value)
  }
  const contains = (types as unknown as { contains?: (type: string) => boolean }).contains
  if (typeof contains === 'function' && contains.call(types, 'Files') && !listed.includes('Files')) listed.push('Files')
  return listed
}

export function isFileDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false
  if (listDragTypes(dataTransfer).some((type) => FILE_DRAG_TYPES.has(type))) return true
  if (dataTransfer.files.length > 0) return true
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    if (dataTransfer.items[index]?.kind === 'file') return true
  }
  return false
}

/** 拦截文件拖放，避免 DSH 对话附件在 document 上把 dropEffect 改成 none。 */
export function claimFileDrag(event: FileDragEvent, dropEffect: 'copy' | 'none'): boolean {
  if (!event.dataTransfer) return false
  const types = listDragTypes(event.dataTransfer)
  if (!isFileDrag(event.dataTransfer) && types.length > 0) return false
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = dropEffect
  return true
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

export function droppedFile(dataTransfer: DataTransfer): DroppedFile | null {
  const fromList = dataTransfer.files.item(0)
  if (fromList) return fromList as DroppedFile
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    const item = dataTransfer.items[index]
    if (item?.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) return file as DroppedFile
  }
  return null
}

export function isDroppedDirectory(dataTransfer: DataTransfer): boolean {
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    const item = dataTransfer.items[index] as DataTransferItem & {
      webkitGetAsEntry?: () => { isDirectory?: boolean } | null
    }
    if (typeof item.webkitGetAsEntry === 'function' && item.webkitGetAsEntry()?.isDirectory) return true
  }
  return false
}

export function droppedSourcePath(dataTransfer: DataTransfer | null): string {
  if (!dataTransfer) return ''
  const filePath = droppedFile(dataTransfer)?.path?.trim()
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

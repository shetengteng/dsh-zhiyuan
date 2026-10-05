/** DataTransfer 拖拽判定：识别文件拖放并接管事件默认行为，与业务路径解析解耦。 */

export type DroppedFile = File & { path?: string }

export type FileDragEvent = {
  preventDefault: () => void
  stopPropagation: () => void
  dataTransfer: DataTransfer | null
}

const FILE_DRAG_TYPES = new Set(['Files', 'application/x-moz-file', 'public.file-url', 'text/uri-list'])

/** 纯文本/链接类拖拽，不属于文件导入，交给浏览器默认行为。 */
const TEXT_DRAG_TYPES = new Set(['text/plain', 'text/html', 'text/csv', 'application/json'])

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
  const types = listDragTypes(dataTransfer)
  if (types.some((type) => FILE_DRAG_TYPES.has(type))) return true
  if (dataTransfer.files.length > 0) return true
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    if (dataTransfer.items[index]?.kind === 'file') return true
  }
  // 含未知类型（如 macOS 文件 promise、UTI 私有类型）时也按文件拖拽接管，
  // 避免落点静默无反应；纯文本/链接拖拽仍交给浏览器默认行为。
  return types.length > 0 && !types.every((type) => TEXT_DRAG_TYPES.has(type))
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

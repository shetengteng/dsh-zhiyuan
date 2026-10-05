import {
  FileTypeIcon,
  IconCloseOutlineRegular,
  IconEditOutlineRegular,
  IconFolderCloseRegular,
  IconFolderOpenOutlineRegular,
  IconProjectAddOutlineRegular,
  IconSearchOutlineRegular,
  IconTrashOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * 设置工作台共用图标：一律转发 DSH 官方 primitives 图标组件，
 * 保证与壳内页面视觉一致；颜色走 currentColor，尺寸由调用处样式或 size 决定。
 * 官方图标集中没有“书”造型，SectionIcon 为本插件的品牌图标，保留手绘实现。
 */

/** 删除：列表行与树节点的删除按钮使用。 */
export function TrashIcon() {
  return <IconTrashOutlineRegular size={14} />
}

/** 搜索。 */
export function SearchIcon() {
  return <IconSearchOutlineRegular />
}

/** 编辑。 */
export function EditIcon() {
  return <IconEditOutlineRegular />
}

/** 导入：画板加号，与壳内「添加工作区」同款，表达往库里加内容。 */
export function ImportIcon() {
  return <IconProjectAddOutlineRegular />
}

/**
 * 树节点文件夹图标：收起时显示合拢文件夹，展开时显示打开的文件夹。
 * 两个状态图标都渲染，由 `.zy-folder` 的 details[open] CSS 规则切换可见性。
 */
export function FolderIcon() {
  return (
    <>
      <IconFolderCloseRegular size={16} className="zy-folder is-closed" />
      <IconFolderOpenOutlineRegular size={16} className="zy-folder is-open" />
    </>
  )
}

/** 树节点文件图标：按扩展名渲染官方文件类型图标，md/csv/xlsx 等各有形状与类别色。 */
export function FileIcon(props: { path: string }) {
  return <FileTypeIcon path={props.path} size={16} className="zy-file-icon" />
}

/** 关闭。 */
export function CloseIcon() {
  return <IconCloseOutlineRegular size={14} />
}

/** 合上的书加书签。视觉字重对齐 DSH 16px 图标。 */
export const BOOK_COVER_D =
  'M3.15 1.55h9.7c.8 0 1.45.65 1.45 1.45v9.9c0 .8-.65 1.45-1.45 1.45H3.15c-.8 0-1.45-.65-1.45-1.45V3c0-.8.65-1.45 1.45-1.45Zm0 1.4c-.03 0-.05.02-.05.05v9.9c0 .03.02.05.05.05h9.7c.03 0 .05-.02.05-.05V3c0-.03-.02-.05-.05-.05H3.15Z'
export const BOOK_SPINE_D = 'M4.5 3.15h1.25v8.8H4.5z'
export const BOOK_RIBBON_D = 'M9.95 1.55h1.45v4.25l-.725-.52-.725.52V1.55z'

export function SectionIcon(props: { size?: number; className?: string }) {
  const size = props.size ?? 16
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BOOK_COVER_D} />
      <path fill="currentColor" d={BOOK_SPINE_D} />
      <path fill="currentColor" d={BOOK_RIBBON_D} />
    </svg>
  )
}

/** 主侧栏全局面板行的图标：壳按 wide/rail 传 16/18px，active 仅作状态标记不改变外观。 */
export function PanelIcon(props: { size?: number; active?: boolean }) {
  return <SectionIcon size={props.size ?? 16} />
}

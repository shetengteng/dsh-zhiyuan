/** 设置工作台共用的 SVG 图标。 */
export function TrashIcon() {
  return (
    <svg className="zy-ico" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M3.5 4.5h9M6.2 4.5V3.2h3.6v1.3M5.2 4.5l.6 8.2h4.4l.6-8.2M6.8 7v4M9.2 7v4" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg className="zy-ico" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2L13 13" />
    </svg>
  )
}

export function TwistIcon() {
  return (
    <svg className="zy-twist" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4.25 2.83v8.34c0 .49.59.74.94.39l4.17-4.17a.55.55 0 0 0 0-.78L5.19 2.44c-.35-.35-.94-.1-.94.39Z" fill="currentColor" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
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

/** Closed book + bookmark. Optical weight matches DSH 16px glyphs. */
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

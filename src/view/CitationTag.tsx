import type { MouseEventHandler, ReactElement } from 'react'

export type CitationTagProps = {
  n: number
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export function CitationTag(props: CitationTagProps): ReactElement {
  const label = props.onClick ? `打开引用 ${props.n} 预览` : `引用 ${props.n}`
  if (props.onClick) {
    return <button className="zy-ntag zy-ntag-button" type="button" aria-label={label} onClick={props.onClick}>{props.n}</button>
  }
  return <span className="zy-ntag" aria-label={label}>{props.n}</span>
}

export function CitationTag(props: { n: number }) {
  return <span className="zy-ntag" aria-label={`引用 ${props.n}`}>{props.n}</span>
}

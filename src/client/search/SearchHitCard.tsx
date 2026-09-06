import type { SearchHit } from '../models.ts'
import { CitationTag } from '../CitationTag.tsx'
import { matchedExcerptLine, parseLabeledFields, type LabeledField } from '../search-utils.ts'

export type SearchHitCardProps = {
  hit: SearchHit
  selected?: boolean
  onOpenHit: (hit: SearchHit, trigger: HTMLButtonElement) => void
}

export function SearchHitCard(props: SearchHitCardProps) {
  const { hit } = props
  return (
    <button
      className={props.selected ? 'zy-hit is-selected' : 'zy-hit'}
      type="button"
      aria-pressed={props.selected}
      aria-label={`打开 ${hit.path} 第 ${hit.matchLine} 行`}
      onClick={(event) => props.onOpenHit(hit, event.currentTarget)}
    >
      <div className="zy-src">
        <CitationTag n={hit.n} />
        <span className="zy-path" title={hit.path}>{hit.path}</span>
        <span className="zy-hit-loc">{hitLineLabel(hit)}</span>
      </div>
      <HitExcerpt text={matchedExcerptLine(hit)} />
    </button>
  )
}

function hitLineLabel(hit: SearchHit): string {
  if (hit.startLine === hit.endLine) return `第 ${hit.matchLine} 行`
  return `第 ${hit.startLine}–${hit.endLine} 行`
}

function HitExcerpt(props: { text: string }) {
  const fields = parseLabeledFields(props.text)
  return fields ? <HitFields fields={fields} /> : <div className="zy-quote">{props.text}</div>
}

function HitFields(props: { fields: LabeledField[] }) {
  return (
    <div className="zy-hit-fields">
      {props.fields.map((field, index) => (
        <span key={`${field.label}-${index}`} className="zy-hit-field">
          <span className="zy-hit-k">{field.label}</span>
          <span className="zy-hit-v" title={field.value}>{field.value}</span>
        </span>
      ))}
    </div>
  )
}

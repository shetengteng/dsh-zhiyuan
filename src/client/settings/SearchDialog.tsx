import type { ReactNode } from 'react'
import { CitationTag } from '../CitationTag.tsx'
import type { SearchHit } from '../models.ts'
import { matchedExcerptLine, parseLabeledFields, queryTerms, type LabeledField } from '../search-utils.ts'
import { Note } from './Dialogs.tsx'
import { SearchIcon } from './Icons.tsx'
import { WorkbenchModal } from './WorkbenchModal.tsx'

export type SearchDialogProps = {
  baseTitle: string
  query: string
  hits: SearchHit[]
  warning: string
  busy: boolean
  searched: boolean
  onClose: () => void
  onSearch: (query: string) => void
  onOpenHit: (hit: SearchHit) => void
}

/** 工作台试搜：加宽弹框，命中以卡片列出，CSV 行拆成字段。 */
export function SearchDialog(props: SearchDialogProps) {
  return (
    <WorkbenchModal open onClose={props.onClose} title={`搜索 ${props.baseTitle}`} className="zy-modal-search">
      <form
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          event.preventDefault()
          props.onSearch(String(new FormData(event.currentTarget).get('query') ?? ''))
        }}
      >
        <div className="zy-search-bar">
          <input className="zy-box" name="query" placeholder="关键词" defaultValue={props.query} autoFocus />
          <button className="zy-icon" type="submit" aria-label="搜索" disabled={props.busy}>
            <SearchIcon />
          </button>
        </div>
      </form>
      <Note text={props.warning} />
      <SearchResults
        query={props.query}
        hits={props.hits}
        warning={props.warning}
        busy={props.busy}
        searched={props.searched}
        onOpenHit={props.onOpenHit}
      />
    </WorkbenchModal>
  )
}

function SearchResults(props: {
  query: string
  hits: SearchHit[]
  warning: string
  busy: boolean
  searched: boolean
  onOpenHit: (hit: SearchHit) => void
}) {
  let body: ReactNode = null
  if (props.busy) {
    body = <p className="zy-search-status">检索中…</p>
  } else if (props.hits.length) {
    body = (
      <>
        <p className="zy-search-status">{props.hits.length} 条命中 · 点击查看原文</p>
        <div className="zy-search-hits">
          {props.hits.map((hit) => (
            <SearchHitCard key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`} hit={hit} query={props.query} onOpenHit={props.onOpenHit} />
          ))}
        </div>
      </>
    )
  } else if (!props.searched) {
    body = <p className="zy-search-empty">输入关键词后回车，在这个知识库里查找原文。</p>
  } else if (!props.warning) {
    body = <p className="zy-search-empty">没有找到相关内容，换个词试试。</p>
  }
  return <div className="zy-search-body">{body}</div>
}

function SearchHitCard(props: {
  hit: SearchHit
  query: string
  onOpenHit: (hit: SearchHit) => void
}) {
  const { hit } = props
  return (
    <button
      className="zy-hit"
      type="button"
      aria-label={`打开 ${hit.path} 第 ${hit.matchLine} 行`}
      onClick={() => props.onOpenHit(hit)}
    >
      <div className="zy-src">
        <CitationTag n={hit.n} />
        <span className="zy-path" title={hit.path}>{hit.path}</span>
        <span className="zy-hit-loc">{hitLineLabel(hit)}</span>
      </div>
      <HitExcerpt text={matchedExcerptLine(hit)} query={props.query} />
    </button>
  )
}

function hitLineLabel(hit: SearchHit): string {
  if (hit.startLine === hit.endLine) return `第 ${hit.matchLine} 行`
  return `第 ${hit.startLine}–${hit.endLine} 行`
}

function HitExcerpt(props: { text: string; query: string }) {
  const fields = parseLabeledFields(props.text)
  if (fields) return <HitFields fields={fields} query={props.query} />
  return <div className="zy-quote"><HitMark text={props.text} query={props.query} /></div>
}

function HitFields(props: { fields: LabeledField[]; query: string }) {
  return (
    <div className="zy-hit-fields">
      {props.fields.map((field, index) => (
        <span key={`${field.label}-${index}`} className="zy-hit-field">
          <span className="zy-hit-k">{field.label}</span>
          <span className="zy-hit-v" title={field.value}><HitMark text={field.value} query={props.query} /></span>
        </span>
      ))}
    </div>
  )
}

function HitMark(props: { text: string; query: string }) {
  const terms = queryTerms(props.query)
  if (!terms.length) return <>{props.text}</>
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const match of props.text.matchAll(pattern)) {
    const start = match.index ?? 0
    const token = match[0]
    if (!token) break
    if (start > cursor) nodes.push(props.text.slice(cursor, start))
    nodes.push(<mark key={`${start}-${token}`}>{token}</mark>)
    cursor = start + token.length
  }
  if (cursor < props.text.length) nodes.push(props.text.slice(cursor))
  return <>{nodes}</>
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

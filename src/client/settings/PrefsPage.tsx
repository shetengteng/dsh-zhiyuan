import { useEffect, useState } from 'react'
import { Menu, IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary, Prefs } from '../models.ts'
import { Note } from './Dialogs.tsx'

const MIB = 1024 * 1024
const GIB = 1024 * 1024 * 1024

export function PrefsPage(props: {
  prefs: Prefs
  bases: BaseSummary[]
  busy: boolean
  error: string
  onSave: (prefs: Prefs) => void
}) {
  const [draft, setDraft] = useState(props.prefs)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setDraft(props.prefs) }, [props.prefs])

  const selectedBase = props.bases.find((base) => base.id === draft.defaultBaseId)
  const label = selectedBase ? (selectedBase.title || selectedBase.id) : '（无）'

  const commit = (next: Prefs) => {
    setDraft(next)
    props.onSave(next)
  }

  return (
    <div>
      <div className="zy-set-row">
        <div className="zy-set-text">
          <div className="zy-set-title">默认打开的库</div>
          <p className="zy-set-desc">未指定知识库时，工作台搜索使用这个默认库。</p>
        </div>
        <Menu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          selectedId={draft.defaultBaseId || 'none'}
          items={[
            { id: 'none', label: '（无）' },
            ...props.bases.map((base) => ({ id: base.id, label: base.title || base.id })),
          ]}
          onSelect={(id: string) => {
            commit({ ...draft, defaultBaseId: id === 'none' ? '' : id })
            setMenuOpen(false)
          }}
          align="end"
          portal
          anchor={(
            <button
              type="button"
              className="zy-selector"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {label}
              <IconChevronDownOutline14 className="zy-chevron" />
            </button>
          )}
        />
      </div>
      <QuotaField
        label="单文件上限"
        description="超过则该文件导入失败。"
        bytes={draft.maxFileBytes}
        unit="MB"
        disabled={props.busy}
        onCommit={(bytes) => commit({ ...draft, maxFileBytes: bytes })}
      />
      <QuotaField
        label="单库文字上限"
        description="超过拒绝本批导入。"
        bytes={draft.maxBaseBytes}
        unit="GB"
        disabled={props.busy}
        onCommit={(bytes) => commit({ ...draft, maxBaseBytes: bytes })}
      />
      <p className="zy-set-title zy-prefs-h">解析器</p>
      <div className="zy-parser"><input type="checkbox" checked disabled /><span>Markdown / txt</span></div>
      <div className="zy-parser"><input type="checkbox" checked disabled /><span>CSV（导入后转 UTF-8，可表格编辑）</span></div>
      <div className="zy-parser is-off"><input type="checkbox" disabled /><span>PDF</span></div>
      <div className="zy-parser is-off"><input type="checkbox" disabled /><span>DOCX</span></div>
      <div className="zy-parser is-off"><input type="checkbox" disabled /><span>自定义命令</span></div>
      <Note text={props.error} />
    </div>
  )
}

function unitSize(unit: 'MB' | 'GB'): number {
  return unit === 'GB' ? GIB : MIB
}

function amountText(bytes: number, unit: 'MB' | 'GB'): string {
  return String(Math.round(bytes / unitSize(unit)))
}

function parseQuotaBytes(text: string, unit: 'MB' | 'GB'): number | undefined {
  const amount = Number.parseInt(text, 10)
  if (!Number.isFinite(amount) || amount < 1) return undefined
  return amount * unitSize(unit)
}

function QuotaField(props: {
  label: string
  description: string
  bytes: number
  unit: 'MB' | 'GB'
  disabled: boolean
  onCommit: (bytes: number) => void
}) {
  const display = amountText(props.bytes, props.unit)
  const [text, setText] = useState(display)
  useEffect(() => { setText(display) }, [display])

  const commitOrRevert = () => {
    const nextBytes = parseQuotaBytes(text, props.unit)
    if (nextBytes === undefined) {
      setText(display)
      return
    }
    if (nextBytes === props.bytes) return
    props.onCommit(nextBytes)
  }

  return (
    <div className="zy-set-row">
      <div className="zy-set-text">
        <div className="zy-set-title">{props.label}</div>
        <p className="zy-set-desc">{props.description}</p>
      </div>
      <div className="zy-num-field">
        <input
          className="zy-box zy-num"
          type="text"
          inputMode="numeric"
          aria-label={`${props.label}（${props.unit}）`}
          disabled={props.disabled}
          value={text}
          onChange={(event: { target: { value: string } }) => {
            setText(event.target.value.replace(/\D/g, ''))
          }}
          onBlur={commitOrRevert}
          onKeyDown={(event: { key: string; currentTarget: { blur: () => void } }) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        <span className="zy-num-unit">{props.unit}</span>
      </div>
    </div>
  )
}

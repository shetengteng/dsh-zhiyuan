import { useEffect, useState } from 'react'
import { Menu, IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary, Prefs } from '../models.ts'
import { Note } from './Dialogs.tsx'

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
      <div className="zy-set-row">
        <div className="zy-set-text">
          <div className="zy-set-title">单文件上限</div>
          <p className="zy-set-desc">超过则该文件导入失败。</p>
        </div>
        <input
          className="zy-selector zy-num"
          value={`${Math.round(draft.maxFileBytes / 1024 / 1024)} MB`}
          onChange={(event: { target: { value: string } }) => {
            const megabytes = parseInt(event.target.value, 10)
            if (!Number.isFinite(megabytes) || megabytes < 1) return
            setDraft({ ...draft, maxFileBytes: megabytes * 1024 * 1024 })
          }}
          onBlur={() => props.onSave(draft)}
        />
      </div>
      <div className="zy-set-row">
        <div className="zy-set-text">
          <div className="zy-set-title">单库文字上限</div>
          <p className="zy-set-desc">超过拒绝本批导入。</p>
        </div>
        <input
          className="zy-selector zy-num"
          value={`${Math.round(draft.maxBaseBytes / 1024 / 1024 / 1024)} GB`}
          onChange={(event: { target: { value: string } }) => {
            const gigabytes = parseInt(event.target.value, 10)
            if (!Number.isFinite(gigabytes) || gigabytes < 1) return
            setDraft({ ...draft, maxBaseBytes: gigabytes * 1024 * 1024 * 1024 })
          }}
          onBlur={() => props.onSave(draft)}
        />
      </div>
      <p className="zy-set-title zy-prefs-h">解析器</p>
      <div className="zy-parser"><input type="checkbox" checked disabled /><span>Markdown / txt</span></div>
      <div className="zy-parser"><input type="checkbox" checked disabled /><span>CSV（UTF-8，可表格编辑）</span></div>
      <div className="zy-parser is-off"><input type="checkbox" disabled /><span>PDF</span></div>
      <div className="zy-parser is-off"><input type="checkbox" disabled /><span>DOCX</span></div>
      <div className="zy-parser is-off"><input type="checkbox" disabled /><span>自定义命令</span></div>
      <Note text={props.error} />
    </div>
  )
}

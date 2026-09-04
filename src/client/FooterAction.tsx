import { useEffect, useRef, useState } from 'react'
import { SECTION_LABEL } from '../identity.ts'
import type { KnowledgePrivateConnection } from './bridge.ts'
import { CloseIcon } from './settings/Icons.tsx'
import { createSettingsSection } from './settings/SettingsSection.tsx'
import { SectionIcon } from './settings/SectionIcon.tsx'
import { ensureSettingsStyles } from './settings/styles.ts'

export type FooterActionProps = {
  wide: boolean
}

/** 脚部入口：弹出仅含知源工作台的弹层，不带设置左侧导航。 */
export function createFooterAction(connection?: KnowledgePrivateConnection) {
  const Workbench = createSettingsSection(connection)
  return function ZhiyuanFooterAction(props: FooterActionProps) {
    ensureSettingsStyles()
    const [open, setOpen] = useState(false)
    const closeRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      if (!open) return
      closeRef.current?.focus()
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        if (document.querySelectorAll('[role="dialog"]').length > 1) return
        setOpen(false)
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [open])

    return (
      <>
        <button
          type="button"
          className={props.wide ? 'zy-footer-action' : 'zy-footer-action is-rail'}
          aria-label={SECTION_LABEL}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <SectionIcon size={props.wide ? 16 : 18} />
          {props.wide ? <span className="zy-footer-action-label">{SECTION_LABEL}</span> : null}
        </button>
        {open ? (
          <div className="zy-footer-overlay" role="presentation">
            <div className="zy-footer-mask" aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              className="zy-footer-panel"
              role="dialog"
              aria-modal="true"
              aria-label={SECTION_LABEL}
            >
              <button
                ref={closeRef}
                type="button"
                className="zy-footer-close"
                aria-label="关闭"
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
              <div className="zy-footer-panel-body">
                <Workbench />
              </div>
            </div>
          </div>
        ) : null}
      </>
    )
  }
}

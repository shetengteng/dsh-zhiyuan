import { useEffect, useRef, useState, type ComponentType } from 'react'
import { SECTION_LABEL } from '../model/constants.ts'
import type { KnowledgePrivateConnection } from './bridge.ts'
import { CloseIcon } from './settings/Icons.tsx'
import { createSettingsSection } from './settings/SettingsSection.tsx'
import { SectionIcon } from './settings/SectionIcon.tsx'
import { ensureSettingsStyles } from './settings/styles.ts'

export type FooterActionProps = {
  wide: boolean
}

/** 侧栏脚部入口：复用工作台内容，只负责打开、关闭与焦点归还。 */
export function createFooterAction(connection?: KnowledgePrivateConnection): ComponentType<FooterActionProps> {
  const Workbench = createSettingsSection(connection)

  return function ZhiyuanFooterAction(props: FooterActionProps) {
    ensureSettingsStyles()
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const closeRef = useRef<HTMLButtonElement>(null)

    const closeWorkbench = (): void => {
      setOpen(false)
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }

    useEffect(() => {
      if (!open) return
      closeRef.current?.focus()
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape') return
        if (document.querySelectorAll('[role="dialog"]').length > 1) return
        closeWorkbench()
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [open])

    return (
      <>
        <button
          ref={triggerRef}
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
            <div className="zy-footer-mask" aria-hidden="true" onClick={closeWorkbench} />
            <div className="zy-footer-panel" role="dialog" aria-modal="true" aria-label={SECTION_LABEL}>
              <button ref={closeRef} type="button" className="zy-footer-close" aria-label="关闭" onClick={closeWorkbench}>
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

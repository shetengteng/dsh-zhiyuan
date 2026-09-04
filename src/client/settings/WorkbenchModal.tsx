import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './Icons.tsx'

export type WorkbenchModalProps = {
  open: boolean
  onClose: () => void
  title: string
  closeLabel?: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/** 工作台内弹框：挂到 body，盖住知源遮罩，并允许把文件拖进框内。 */
export function WorkbenchModal(props: WorkbenchModalProps) {
  const titleId = useId()
  const onCloseRef = useRef(props.onClose)
  onCloseRef.current = props.onClose
  const [maskReady, setMaskReady] = useState(false)

  useEffect(() => {
    if (!props.open) {
      setMaskReady(false)
      return
    }
    const timer = window.setTimeout(() => setMaskReady(true), 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [props.open])

  if (!props.open || typeof document === 'undefined') return null

  return createPortal(
    <div className="zy-dialog-root" role="presentation">
      <div
        className="zy-dialog-mask"
        aria-hidden="true"
        onClick={maskReady ? () => onCloseRef.current() : undefined}
      />
      <div
        className={props.className ? `zy-dialog ${props.className}` : 'zy-dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="zy-dialog-inner">
          <h2 id={titleId} className="zy-dialog-title">{props.title}</h2>
          <button type="button" className="zy-dialog-close" aria-label={props.closeLabel ?? '关闭'} onClick={props.onClose}>
            <CloseIcon />
          </button>
          {props.description ? <p className="zy-dialog-desc">{props.description}</p> : null}
          {props.children}
          {props.footer}
        </div>
      </div>
    </div>,
    document.body,
  )
}

import { useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

export type KbResizerProps = {
  /** 被调栏当前宽度。 */
  width: number
  /** 被调栏在分隔条的哪一侧：决定拖动与方向键的增宽方向。 */
  side: 'left' | 'right'
  label: string
  onChange: (width: number) => void
}

/** 工作台三栏之间的可拖动分隔条：左右拖动或方向键调整相邻栏宽度，越界由上层收敛。 */
export function KbResizer(props: KbResizerProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { startX: event.clientX, startWidth: props.width }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state) return
    const delta = props.side === 'right' ? state.startX - event.clientX : event.clientX - state.startX
    props.onChange(state.startWidth + delta)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const growKey = props.side === 'right' ? 'ArrowLeft' : 'ArrowRight'
    const shrinkKey = props.side === 'right' ? 'ArrowRight' : 'ArrowLeft'
    if (event.key === growKey) {
      props.onChange(props.width + 24)
      event.preventDefault()
    } else if (event.key === shrinkKey) {
      props.onChange(props.width - 24)
      event.preventDefault()
    }
  }

  return (
    <div
      className="zy-kb-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={props.label}
      aria-valuenow={Math.round(props.width)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    />
  )
}

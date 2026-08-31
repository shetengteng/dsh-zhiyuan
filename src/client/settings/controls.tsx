export function Switch(props: {
  on: boolean
  label: string
  disabled?: boolean
  onToggle?: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.on}
      aria-label={props.label}
      disabled={props.disabled}
      className={`zy-switch${props.on ? ' is-on' : ''}`}
      onClick={props.disabled ? undefined : props.onToggle}
    >
      <span className="zy-switch-knob" />
    </button>
  )
}

export function ToggleRow(props: {
  title: string
  desc?: string
  on: boolean
  disabled?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="zy-set-row">
      <div className="zy-set-text">
        <div className="zy-set-title">{props.title}</div>
        {props.desc ? <p className="zy-set-desc">{props.desc}</p> : null}
      </div>
      <Switch on={props.on} label={props.title} disabled={props.disabled} onToggle={props.onToggle} />
    </div>
  )
}

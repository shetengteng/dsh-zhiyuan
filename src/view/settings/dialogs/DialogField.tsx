import type { ReactNode } from 'react'
import { IconWarningOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

/** 设置工作台共用的表单原语：字段容器、警示条与表单脚手架。 */

export function Field(props: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="zy-field">
      <label>{props.label}</label>
      {props.children}
      {props.help ? <p className="zy-help">{props.help}</p> : null}
    </div>
  )
}

export function Note(props: { text: string }) {
  if (!props.text) return null
  return (
    <p className="zy-note">
      <IconWarningOutlineRegular size={14} />
      {props.text}
    </p>
  )
}

/** 读取表单数据并阻止默认提交刷新。 */
export function readFormData(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

export function FormFooter(props: { children: ReactNode }) {
  return <div className="zy-footbar">{props.children}</div>
}

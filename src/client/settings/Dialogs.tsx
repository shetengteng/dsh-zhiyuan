import { useRef } from 'react'
import { Button, IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary } from '../models.ts'
import { WorkbenchModal } from './WorkbenchModal.tsx'

/** 设置工作台共用的控件与弹框。 */

export function Field(props: { label: string; help?: string; children: unknown }) {
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
      <IconWarningOutline16 size={14} />
      {props.text}
    </p>
  )
}

function readFormData(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

function FormFooter(props: { children: unknown }) {
  return <div className="zy-footbar">{props.children}</div>
}

export function CreateDialog(props: {
  error: string
  busy: boolean
  onClose: () => void
  onSubmit: (input: { title: string; description: string; aliases: string }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  return (
    <WorkbenchModal
      open
      onClose={props.onClose}
      title="新建知识库"
      className="zy-modal-form"
      footer={(
        <FormFooter>
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          <button className="zy-btn zy-primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>创建</button>
        </FormFooter>
      )}
    >
      <form
        ref={form}
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          const data = readFormData(event)
          props.onSubmit({
            title: String(data.get('title') ?? ''),
            description: String(data.get('description') ?? ''),
            aliases: String(data.get('aliases') ?? ''),
          })
        }}
      >
        <Field label="标题 *" help="标题不能与已有知识库重复。">
          <input className="zy-box" name="title" placeholder="工作库" required />
        </Field>
        <Field label="描述 *">
          <textarea className="zy-area" name="description" required placeholder="这个知识库装什么、什么问题该查它、什么不要放" />
        </Field>
        <Field label="别名">
          <input className="zy-box" name="aliases" placeholder="工作, 公司" />
        </Field>
        <Note text={props.error} />
      </form>
    </WorkbenchModal>
  )
}

export function EditDialog(props: {
  base: BaseSummary
  error: string
  busy: boolean
  onClose: () => void
  onDelete: () => void
  onSubmit: (input: { title: string; description: string; aliases: string }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  return (
    <WorkbenchModal
      open
      onClose={props.onClose}
      title="编辑知识库"
      className="zy-modal-form"
      footer={(
        <FormFooter>
          <button className="zy-btn zy-danger" type="button" onClick={props.onDelete}>删除</button>
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          <button className="zy-btn zy-primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>保存</button>
        </FormFooter>
      )}
    >
      <form
        ref={form}
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          const data = readFormData(event)
          props.onSubmit({
            title: String(data.get('title') ?? ''),
            description: String(data.get('description') ?? ''),
            aliases: String(data.get('aliases') ?? ''),
          })
        }}
      >
        <Field label="标题 *" help="标题不能与其他知识库重复。">
          <input className="zy-box" name="title" defaultValue={props.base.title} required />
        </Field>
        <Field label="描述 *">
          <textarea className="zy-area" name="description" defaultValue={props.base.description} required />
        </Field>
        <Field label="别名">
          <input className="zy-box" name="aliases" defaultValue={props.base.aliases.join(', ')} />
        </Field>
        <Note text={props.error} />
      </form>
    </WorkbenchModal>
  )
}

export function ConfirmDialog(props: {
  message: string
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <WorkbenchModal
      open
      onClose={props.onClose}
      title="确认删除"
      closeLabel="关闭"
      className="zy-modal-form"
      description={props.message}
      footer={(
        <FormFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>取消</Button>
          <Button type="button" variant="outline" className="zy-danger" disabled={props.busy} onClick={props.onConfirm}>删除</Button>
        </FormFooter>
      )}
    />
  )
}

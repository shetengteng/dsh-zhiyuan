import { useRef } from 'react'
import { Button, Input, Modal, IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BaseSummary } from '../models.ts'

export { Modal }

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

function readForm(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}

export function CreateDialog(props: {
  error: string
  busy: boolean
  onClose: () => void
  onSubmit: (input: { id: string; title: string; description: string; aliases: string }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  return (
    <Modal
      open
      onClose={props.onClose}
      title="新建知识库"
      className="zy-modal-form"
      footer={(
        <>
          <Button variant="ghost" type="button" onClick={props.onClose}>取消</Button>
          <Button variant="primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>创建</Button>
        </>
      )}
    >
      <form
        ref={form}
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          const data = readForm(event)
          props.onSubmit({
            id: String(data.get('id') ?? ''),
            title: String(data.get('title') ?? ''),
            description: String(data.get('description') ?? ''),
            aliases: String(data.get('aliases') ?? ''),
          })
        }}
      >
        <Field label="id *" help="创建后不能改。路径会是 bases/<id>/">
          <Input className="zy-input" name="id" placeholder="work" required />
        </Field>
        <Field label="标题 *">
          <Input className="zy-input" name="title" placeholder="工作库" required />
        </Field>
        <Field label="描述 *">
          <textarea className="zy-area" name="description" required placeholder="这个知识库装什么、什么问题该查它、什么不要放" />
        </Field>
        <Field label="别名">
          <Input className="zy-input" name="aliases" placeholder="工作, 公司" />
        </Field>
        <Note text={props.error} />
      </form>
    </Modal>
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
    <Modal
      open
      onClose={props.onClose}
      title="编辑知识库"
      className="zy-modal-form"
      footer={(
        <>
          <Button variant="ghost" type="button" onClick={props.onDelete}>删除</Button>
          <Button variant="ghost" type="button" onClick={props.onClose}>取消</Button>
          <Button variant="primary" type="button" disabled={props.busy} onClick={() => form.current?.requestSubmit()}>保存</Button>
        </>
      )}
    >
      <form
        ref={form}
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          const data = readForm(event)
          props.onSubmit({
            title: String(data.get('title') ?? ''),
            description: String(data.get('description') ?? ''),
            aliases: String(data.get('aliases') ?? ''),
          })
        }}
      >
        <Field label="id" help="创建后不能改">
          <Input className="zy-input" value={props.base.id} readOnly />
        </Field>
        <Field label="标题 *">
          <Input className="zy-input" name="title" defaultValue={props.base.title} required />
        </Field>
        <Field label="描述 *">
          <textarea className="zy-area" name="description" defaultValue={props.base.description} required />
        </Field>
        <Field label="别名">
          <Input className="zy-input" name="aliases" defaultValue={props.base.aliases.join(', ')} />
        </Field>
        <Note text={props.error} />
      </form>
    </Modal>
  )
}

export function ConfirmDialog(props: {
  message: string
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open
      onClose={props.onClose}
      title="确认删除"
      className="zy-modal-form"
      description={props.message}
      footer={(
        <>
          <Button variant="ghost" type="button" onClick={props.onClose}>取消</Button>
          <Button variant="primary" type="button" disabled={props.busy} onClick={props.onConfirm}>删除</Button>
        </>
      )}
    />
  )
}

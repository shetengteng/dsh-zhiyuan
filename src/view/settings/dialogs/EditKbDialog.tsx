import { useRef } from 'react'
import type { KbSummaryResponse } from '../../view-models.ts'
import { Field, FormFooter, Note, readFormData } from './DialogField.tsx'
import { Modal } from './Modal.tsx'

/** 编辑知识库弹框：保存基础信息，入口提供删除。 */
export function EditKbDialog(props: {
  kb: KbSummaryResponse
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
          <input className="zy-box" name="title" defaultValue={props.kb.title} required />
        </Field>
        <Field label="描述 *">
          <textarea className="zy-area" name="description" defaultValue={props.kb.description} required />
        </Field>
        <Field label="别名">
          <input className="zy-box" name="aliases" defaultValue={props.kb.aliases.join(', ')} />
        </Field>
        <Note text={props.error} />
      </form>
    </Modal>
  )
}

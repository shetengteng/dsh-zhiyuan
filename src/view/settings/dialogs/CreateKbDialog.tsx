import { useRef } from 'react'
import { Field, FormFooter, Note, readFormData } from './DialogField.tsx'
import { Modal } from './Modal.tsx'

/** 新建知识库弹框。 */
export function CreateKbDialog(props: {
  error: string
  busy: boolean
  onClose: () => void
  onSubmit: (input: { title: string; description: string; aliases: string }) => void
}) {
  const form = useRef<HTMLFormElement>(null)
  return (
    <Modal
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
    </Modal>
  )
}

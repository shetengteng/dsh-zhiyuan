import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { FormFooter, Note } from './DialogField.tsx'
import { Modal } from './Modal.tsx'

/** 删除确认弹框。 */
export function ConfirmDialog(props: {
  message: string
  error: string
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
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
    >
      <Note text={props.error} />
    </Modal>
  )
}

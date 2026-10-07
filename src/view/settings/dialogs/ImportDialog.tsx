import { useState } from 'react'
import { Modal } from './Modal.tsx'
import { Field, Note } from './DialogField.tsx'
import { CategorySelect } from './CategorySelect.tsx'
import { ImportProgressPanel, ImportResultPanel, useImportProgress } from './ImportProgressPanel.tsx'
import type { ImportResponse } from '../../../view/view-models.ts'

/** 设置工作台的导入弹框：导入源只走系统选择按钮，不做拖拽。 */

/** 从路径里取展示名，兼容正反斜杠与结尾分隔符。 */
function sourceDisplayName(sourcePath: string): string {
  const trimmedPath = sourcePath.replace(/[\\/]+$/, '')
  return trimmedPath.split(/[\\/]/).pop() || trimmedPath
}

export function ImportDialog(props: {
  kbTitle: string
  error: string
  busy: boolean
  /** 当前库内已有的类目路径，供下拉选择。 */
  categories: string[]
  /** 轮询 Host 任务状态的回调；缺省（如无连接）时不展示实时进度。 */
  onPollJobStatus?: () => Promise<unknown>
  /** 最近一次导入的最终结果；存在时弹框停留展示完成态，等用户点「关闭」确认。 */
  result?: ImportResponse
  onClose: () => void
  onPick: (kind: 'file' | 'dir') => Promise<string>
  onSubmit: (input: {
    sourcePath: string
    destCategory: string
    preserveTree: boolean
    createMissing: boolean
  }) => void
}) {
  const [destCategory, setDestCategory] = useState('')
  const [createMissing, setCreateMissing] = useState(true)
  const [preserveTree, setPreserveTree] = useState(false)
  const [picking, setPicking] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [sourceError, setSourceError] = useState('')

  const importProgress = useImportProgress(props.busy, props.onPollJobStatus)

  const blocked = picking || props.busy

  const pick = async (kind: 'file' | 'dir') => {
    if (blocked) return
    setPicking(true)
    try {
      const path = await props.onPick(kind)
      if (path) {
        setSourcePath(path)
        setSourceLabel(sourceDisplayName(path))
        setSourceError('')
      }
    } finally {
      setPicking(false)
    }
  }

  const submitImport = () => {
    if (blocked) return
    if (!sourcePath) {
      setSourceError('请先点击「选择文件夹」或「选择文件」选择要导入的内容')
      return
    }
    props.onSubmit({ sourcePath, destCategory: destCategory.trim(), preserveTree, createMissing })
  }

  const sourceDropzone = (
    <div className="zy-source-drop" role="group" aria-label="导入源" aria-busy={blocked}>
      <strong className="zy-source-copy">{sourceLabel ? `已选择：${sourceLabel}` : '从本机选择文件或文件夹'}</strong>
      <span className="zy-source-hint">{sourceLabel ? '可点击按钮更换' : '只读取本机路径，不会修改源文件'}</span>
      <div className="zy-source-actions">
        <button className="zy-btn zy-source-action" type="button" disabled={blocked} onClick={() => void pick('dir')}>选择文件夹</button>
        <button className="zy-btn zy-source-action" type="button" disabled={blocked} onClick={() => void pick('file')}>选择文件</button>
      </div>
    </div>
  )

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`导入到 ${props.kbTitle}`}
      className="zy-modal-form-wide"
      footer={props.result ? (
        <div className="zy-footbar">
          <button className="zy-btn zy-primary" type="button" onClick={props.onClose}>关闭</button>
        </div>
      ) : (
        <div className="zy-footbar">
          <button className="zy-btn" type="button" onClick={props.onClose}>取消</button>
          <button className="zy-btn zy-primary" type="button" disabled={blocked} onClick={submitImport}>开始导入</button>
        </div>
      )}
    >
      <form
        onSubmit={(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
          event.preventDefault()
          submitImport()
        }}
      >
        <Field
          label="源"
          help="点击按钮从本机选择。支持 md / txt / markdown / csv / docx / xlsx / pdf / html；单文件上限默认 5 MiB（可在偏好调整）。csv 最大 20 MiB；docx 转 Markdown，图片会丢弃，GBK、UTF-16 会转成 UTF-8；xlsx 每个 sheet 转成一个 CSV，转出的表格可编辑，最多 128 个工作表、单表不超过 3000 行 × 40 列、转换产物合计不超过 20 MB；html / htm 转 Markdown，图片与脚本会丢弃，GBK 等编码自动转 UTF-8；pdf 转 Markdown，仅提取文本层，最多 512 页，加密或扫描件会拒绝。"
        >
          {sourceDropzone}
          <Note text={sourceError} />
        </Field>
        <Field label="类目" help="空 = 库根。可从现有类目选择，也可直接输入新路径，不会因此新建知识库。">
          <CategorySelect categories={props.categories} value={destCategory} onChange={setDestCategory} />
        </Field>
        <div className="zy-checks">
          <label>
            <input type="checkbox" checked={createMissing} onChange={() => setCreateMissing((value) => !value)} />
            目录不存在则创建
          </label>
          <label>
            <input type="checkbox" checked={preserveTree} onChange={() => setPreserveTree((value) => !value)} />
            保留源目录结构
          </label>
        </div>
        <Note text={props.error} />
        {props.result ? <ImportResultPanel result={props.result} /> : importProgress ? <ImportProgressPanel progress={importProgress} /> : null}
      </form>
    </Modal>
  )
}

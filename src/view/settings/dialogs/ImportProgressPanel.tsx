import { useEffect, useRef, useState } from 'react'
import { extractImportProgress } from '../../payload/import-result.ts'
import type { ImportFileResponse, ImportProgress, ImportResponse } from '../../../view/view-models.ts'

/** 导入弹框的实时进度：轮询任务状态端点，展示进度条、计数与逐文件结果。 */

const PROGRESS_POLL_INTERVAL_MS = 400

/** active 期间轮询 Host 任务状态并收窄导入进度；轮询异常时静默跳过本轮。 */
export function useImportProgress(active: boolean, poll?: () => Promise<unknown>) {
  const [progress, setProgress] = useState(null as ImportProgress | null)
  const pollRef = useRef(poll)
  pollRef.current = poll

  useEffect(() => {
    if (!active || !pollRef.current) return
    setProgress(null)
    let cancelled = false
    const tick = async () => {
      try {
        const next = extractImportProgress(await pollRef.current?.())
        if (!cancelled && next) setProgress(next)
      } catch {
        // 状态端点抖动或断连时等待下一次轮询；进度只是附加信息，不打断导入。
      }
    }
    void tick()
    const timer = window.setInterval(() => void tick(), PROGRESS_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [active])

  return progress
}

/** 失败/跳过行展示源文件名对照原因；成功行展示落库后的相对路径。 */
function progressRowName(item: ImportFileResponse): string {
  return item.status === 'failed' || item.status === 'skipped' ? item.sourceRelPath : item.relPath
}

/** 逐文件结果列表：实时进度与完成态共用同一套行展示。 */
function ImportFileList(props: { files: ImportFileResponse[] }) {
  if (!props.files.length) return null
  return (
    <ul className="zy-import-progress-files">
      {props.files.map((item) => (
        <ImportProgressRow key={`${item.status}:${item.relPath || item.sourceRelPath}`} item={item} />
      ))}
    </ul>
  )
}

function ImportProgressRow(props: { item: ImportFileResponse }) {
  const { item } = props
  return (
    <li className={`zy-import-progress-row is-${item.status}`}>
      <span className="zy-import-progress-name">{progressRowName(item)}</span>
      {item.reason ? <span className="zy-import-progress-reason">{item.reason}</span> : null}
    </li>
  )
}

export function ImportProgressPanel(props: { progress: ImportProgress }) {
  const { progress } = props
  const copied = progress.files.filter((item) => item.status === 'copied' || item.status === 'renamed').length
  const skipped = progress.files.filter((item) => item.status === 'skipped').length
  const failed = progress.files.filter((item) => item.status === 'failed').length
  const percent = progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0
  return (
    <div className="zy-import-progress" role="status">
      <div className="zy-import-progress-head">
        <span className="zy-import-progress-count">{progress.processed}/{progress.total}</span>
        {progress.current ? <span className="zy-import-progress-current">正在处理：{progress.current}</span> : null}
        <span className="zy-import-progress-counts">新增 {copied}，跳过 {skipped}，失败 {failed}</span>
      </div>
      <div className="zy-import-progress-bar" aria-hidden="true">
        <div className="zy-import-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <ImportFileList files={progress.files} />
    </div>
  )
}

/** 导入完成态：弹框停留时展示最终汇总与全部逐文件结果，等用户点「关闭」确认。 */
export function ImportResultPanel(props: { result: ImportResponse }) {
  const { result } = props
  return (
    <div className="zy-import-progress is-done" role="status">
      <div className="zy-import-progress-head">
        <strong className="zy-import-progress-done-title">导入完成：新增 {result.copied.length}，跳过 {result.skipped}，失败 {result.failed}</strong>
      </div>
      <div className="zy-import-progress-bar" aria-hidden="true">
        <div className="zy-import-progress-fill" style={{ width: '100%' }} />
      </div>
      <ImportFileList files={result.files} />
    </div>
  )
}

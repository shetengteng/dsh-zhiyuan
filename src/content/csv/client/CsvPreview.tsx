import type { ReadEntryResult } from '../../../client/models.ts'

export function CsvPreview(props: { preview: ReadEntryResult }) {
  const lines = props.preview.text.split('\n')
  const status = statusText(props.preview)
  return (
    <div className="zy-csv-preview">
      <div className="zy-preview-status" role="status">
        {status}
      </div>
      <pre className="zy-csv-body" aria-label="CSV 只读预览">
        {lines.map((line, index) => {
          const lineNumber = props.preview.windowStartLine + index
          const focused = props.preview.previewStatus === 'ready' && lineNumber === props.preview.focusLine
          return (
            <span className={focused ? 'zy-csv-line is-focus' : 'zy-csv-line'} key={lineNumber}>
              {focused ? <mark>{line || '\u00a0'}</mark> : line || '\u00a0'}
              {index < lines.length - 1 ? '\n' : null}
            </span>
          )
        })}
      </pre>
    </div>
  )
}

function statusText(preview: ReadEntryResult): string {
  const location = preview.view === 'search-hit' ? '显示命中附近' : '显示文件开头'
  const truncation = preview.truncation === 'both'
    ? '，前后均有省略'
    : preview.truncation === 'before'
      ? '，前面有省略'
      : preview.truncation === 'after'
        ? '，后面有省略'
        : ''
  if (preview.previewStatus === 'stale') return `${location}；文件已变化，未高亮旧命中${truncation}`
  if (preview.previewStatus === 'fallback') return `${location}；命中位置已失效，显示安全文本${truncation}`
  return `${location}${truncation}`
}

export type CsvTextPreviewProps = {
  text: string
}

/** 表格结构不可用时，安全展示 Host 已返回的原始 CSV 文本。 */
export function CsvTextPreview(props: CsvTextPreviewProps) {
  return (
    <div className="zy-csv-preview">
      <div className="zy-preview-status" role="status">表格预览不可用，已显示原始文本</div>
      <pre className="zy-csv-body" aria-label="CSV 原始文本预览">{props.text}</pre>
    </div>
  )
}

type TextBlock = { type: 'text'; text: string }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: string): TextBlock[] {
  return [{ type: 'text' as const, text: value }]
}

export function renderImportResult(value: unknown): TextBlock[] {
  const result = asRecord(value)
  const copied = Array.isArray(result?.copied) ? result.copied.filter((item): item is string => typeof item === 'string') : []
  const skipped = typeof result?.skipped === 'number' ? result.skipped : 0
  const failed = typeof result?.failed === 'number' ? result.failed : 0
  const files = Array.isArray(result?.files) ? result.files : []
  const failedFiles = files
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null && item.status === 'failed')
    .slice(0, 5)
    .map((item) => `${typeof item.sourceRelPath === 'string' ? item.sourceRelPath : String(item.relPath ?? '文件')}：${typeof item.reason === 'string' ? item.reason : '处理失败'}`)
  const summary = `导入 ${copied.length} · 跳过 ${skipped} · 失败 ${failed}`
  return text(failedFiles.length ? `${summary}\n${failedFiles.join('\n')}` : summary)
}

import type { ReadEntryResponse } from '../../view-models.ts'

/** 命中失效时降级为纯文本展示；形态转换在此完成，上层不感知格式。 */
export function toTextFallback(preview: ReadEntryResponse, fallbackText: string): ReadEntryResponse {
  if (preview.kind === 'text') return { ...preview, text: fallbackText }
  const { table: _table, ...meta } = preview
  return { ...meta, kind: 'text', text: fallbackText }
}

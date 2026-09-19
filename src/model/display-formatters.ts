/** 知识库展示层格式化函数。 */
import { SECTION_LABEL, VERSION_LABEL } from './package-info.ts'

/** 展示层标题附加版本，不写回知识库卡片的持久化 title。 */
export function formatKbDisplayTitle(title: string, fallback = ''): string {
  const displayTitle = title.trim() || fallback.trim() || '未命名知识库'
  return `${displayTitle} · ${SECTION_LABEL} ${VERSION_LABEL}`
}

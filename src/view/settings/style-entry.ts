import { DIALOG_EDITOR_CSS } from './dialog-editor-styles.ts'
import { CITATION_TAIL_CSS } from '../citation/citation-tail-styles.ts'
import { PREVIEW_CSS } from './preview-styles.ts'
import { RDG_CSS } from './rdg-styles.ts'
import { SEARCH_CSS } from './search-styles.ts'
import { WORKBENCH_CSS } from './workbench-styles.ts'

const STYLE_ID = 'dsh-zhiyuan-settings-css'
const CSS = [WORKBENCH_CSS, SEARCH_CSS, PREVIEW_CSS, RDG_CSS, DIALOG_EDITOR_CSS, CITATION_TAIL_CSS].join('\n')

export function ensureSettingsStyles(): void {
  if (typeof document === 'undefined' || !document.head) return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  if (style.textContent !== CSS) style.textContent = CSS
}

export function disposeSettingsStyles(): void {
  if (typeof document === 'undefined') return
  document.getElementById(STYLE_ID)?.remove()
}

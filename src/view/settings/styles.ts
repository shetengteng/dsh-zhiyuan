import { DIALOG_EDITOR_CSS } from './dialog-editor-styles.ts'
import { PREVIEW_CSS } from './preview-styles.ts'
import { SEARCH_CSS } from './search-styles.ts'
import { WORKBENCH_CSS } from './workbench-styles.ts'

const STYLE_ID = 'dsh-zhiyuan-settings-css'
const FOOTER_ACTION_CSS = `
.zy-footer-action{box-sizing:border-box;width:calc(100% + 4px);height:42px;margin:4px -2px -4px;padding:0 10px 0 8px;border:0;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;display:flex;align-items:center;gap:8px;overflow:hidden;cursor:pointer;flex:none}
.zy-footer-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-footer-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-footer-action.is-rail{width:36px;height:36px;margin:0 0 -8px;padding:0;border-radius:50%;justify-content:center;gap:0}
.zy-footer-action-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-footer-overlay{z-index:1000;position:fixed;inset:0;display:flex;align-items:center;justify-content:center;animation:zy-footer-in .15s var(--ds-ease-in-out,ease)}
@keyframes zy-footer-in{0%{opacity:0}}
.zy-footer-mask{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}
.zy-footer-panel{z-index:1;position:relative;box-sizing:border-box;width:min(800px,calc(100vw - 48px));height:min(800px,calc(100vh - 48px));padding:20px 24px 24px;border-radius:24px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv3);display:flex;flex-direction:column;overflow:hidden}
.zy-footer-close{z-index:2;position:absolute;top:14px;right:14px;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.zy-footer-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-footer-close:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-footer-panel-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.zy-footer-panel-body .zy-head{padding-right:36px}
`
const CSS = [WORKBENCH_CSS, SEARCH_CSS, PREVIEW_CSS, DIALOG_EDITOR_CSS, FOOTER_ACTION_CSS].join('\n')

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

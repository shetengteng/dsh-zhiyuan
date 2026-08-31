const STYLE_ID = 'dsh-zhiyuan-settings-css'

export function ensureSettingsStyles(): void {
  if (typeof document === 'undefined' || !document.head) return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = CSS
}

const CSS = `
.zy{font:inherit;color:var(--dsw-alias-label-primary);height:100%;min-height:420px;display:flex;flex-direction:column}
.zy-head{display:flex;flex-direction:column;gap:12px;padding:4px 0 6px}
.zy-head-title{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-primary)}
.zy-head-title svg{flex:none}
.zy-head-title h1{margin:0;font-size:16px;font-weight:500;line-height:24px}
.zy-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l2);align-items:flex-end}
.zy-tab{border:none;background:none;font:inherit;font-size:13px;color:var(--dsw-alias-label-secondary);padding:7px 12px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.zy-tab.is-on{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}
.zy-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:12px 0 0}
.zy-note{margin:0;color:var(--dsw-alias-state-error-primary);font-size:13px;display:flex;align-items:center;gap:6px}
.zy-lib{flex:1;min-height:0;display:grid;grid-template-columns:168px minmax(0,1fr)}
.zy-lib.is-empty{grid-template-columns:1fr}
.zy-list,.zy-cab{border:1px solid var(--dsw-alias-border-l2);min-height:0}
.zy-list{border-radius:12px 0 0 12px;border-right:none;display:flex;flex-direction:column;padding:4px}
.zy-cab{border-radius:0 12px 12px 0;padding:0;display:flex;flex-direction:column}
.zy-lib.is-empty .zy-cab{border-radius:12px;justify-content:center;align-items:center;border-left:1px solid var(--dsw-alias-border-l2)}
.zy-row{position:relative;border-radius:12px}
.zy-row:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}
.zy-row.is-on,.zy-row.is-on:hover{background:var(--dsw-specific-sidebar-nav-item-active)}
.zy-base{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 36px 8px 10px;border-radius:12px;color:inherit;font:inherit}
.zy-row-del{position:absolute;right:4px;top:6px;opacity:0}
.zy-row:hover .zy-row-del{opacity:1}
.zy-list-add{margin-top:auto}
.zy-cab-head{display:flex;align-items:center;gap:10px;padding:8px 12px 6px}
.zy-cab-head>div:first-child{min-width:0;flex:1}
.zy-cab-head h2{margin:0;font-size:15px;font-weight:500;line-height:22px}
.zy-sub{margin:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-actions{margin-left:auto;display:flex;gap:8px}
.zy-door{margin:0 10px 4px}
.zy-tree{flex:1;overflow:auto;padding:2px 8px 8px}
.zy-tree details{padding-left:10px}
.zy-tree>details{padding-left:0}
.zy-tree summary{cursor:pointer;list-style:none;padding:3px 8px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:6px}
.zy-tree summary::-webkit-details-marker,.zy-tree summary::marker{display:none;content:none}
.zy-tree summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-file{display:grid;grid-template-columns:minmax(0,1fr) auto 28px;gap:8px;padding:3px 8px 3px 22px;border-radius:8px;font-size:13px;align-items:center}
.zy-file:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-file .meta{color:var(--dsw-alias-label-tertiary)}
.zy-file-open{border:0;background:transparent;text-align:left;color:inherit;font:inherit;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-foot{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-foot-search{margin-left:auto}
.zy-empty{text-align:center;max-width:36ch;padding:24px 16px;color:var(--dsw-alias-label-tertiary)}
.zy-empty h2{margin:0;color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500}
.zy-empty p{margin:8px 0 16px;font-size:13px;line-height:20px}
.zy-set-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.zy-set-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:24px}
.zy-set-title{font-size:14px;line-height:22px}
.zy-set-desc{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.zy-selector{display:inline-flex;align-items:center;gap:12px;height:36px;padding:0 14px;border:none;border-radius:18px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;font-size:14px;cursor:pointer}
.zy-selector:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-chevron{flex:none}
.zy-num{width:88px;flex:none}
.zy-unit{color:var(--dsw-alias-label-tertiary);font-size:13px}
.zy-switch{box-sizing:border-box;position:relative;width:36px;height:20px;padding:0;border:none;border-radius:99px;background:var(--dsw-alias-label-dimmed);cursor:pointer;flex-shrink:0}
.zy-switch.is-on{background:var(--dsw-alias-label-primary)}
.zy-switch:disabled{opacity:.45;cursor:not-allowed}
.zy-switch:focus-visible{outline:1px solid var(--dsw-alias-label-primary);outline-offset:2px}
.zy-switch-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:99px;background:var(--dsw-alias-bg-base);transition:left .15s ease}
.zy-switch.is-on .zy-switch-knob{left:18px}
.zy-tree-del{opacity:0}
.zy-file:hover .zy-tree-del,.zy-tree summary:hover .zy-tree-del{opacity:1}
.zy-modal-wide{width:min(720px,calc(100% - 32px))}
.zy-modal-form{width:min(520px,calc(100% - 32px));max-width:calc(100% - 32px)}
.zy-field{display:flex;flex-direction:column;gap:6px;margin:0 0 12px}
.zy-field label{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.zy-input{width:100%;box-sizing:border-box}
.zy-help{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.zy-area{width:100%;min-height:88px;resize:vertical;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-input-major);border-radius:8px;padding:8px 10px;color:inherit;font:inherit;font-size:14px;line-height:22px}
.zy-area:focus,.zy-area:focus-visible{outline:none;border-color:var(--dsw-alias-label-primary)}
.zy-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;font-size:14px;line-height:22px}
.zy-about{max-width:62ch}
.zy-about h3{margin:20px 0 8px;font-size:14px;font-weight:500}
.zy-about p,.zy-about li{margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.zy-demo{background:var(--dsw-alias-bg-module-platform);border-radius:10px;padding:10px 12px;margin:0 0 8px}
.zy-pre{white-space:pre-wrap;font-family:var(--ds-font-family-code);font-size:13px;line-height:20px;max-height:360px;overflow:auto}
.zy-search-bar{display:flex;align-items:center;gap:4px;margin:0 0 12px}
.zy-search-q{flex:1;min-width:0}
.zy-pre mark.zy-hl{background:var(--dsw-specific-bubble-highlight);color:inherit}
.zy-hit{width:100%;text-align:left;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1);margin:0 0 6px;color:inherit;font:inherit}
.zy-hit:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-src{display:block;color:var(--dsw-alias-label-tertiary);font-size:12px;margin-bottom:2px}
.zy-hit-ex{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.zy-ntag{font-family:var(--ds-font-family-code);background:var(--dsw-alias-markdown-citation);padding:0 5px;border-radius:4px}
`

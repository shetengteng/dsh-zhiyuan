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

export function disposeSettingsStyles(): void {
  if (typeof document === 'undefined') return
  document.getElementById(STYLE_ID)?.remove()
}

const CSS = `
.zy{font:inherit;color:var(--dsw-alias-label-primary);height:100%;min-height:420px;display:flex;flex-direction:column;gap:8px}
.zy-head{display:flex;align-items:center;gap:16px;min-height:36px;flex:none}
.zy-head-title{display:flex;align-items:center;gap:8px;flex:1;min-width:0}
.zy-head-title svg{flex:none}
.zy-head-title h1{margin:0;font-size:18px;font-weight:600;line-height:24px}
.zy-tabs{display:flex;gap:16px;align-items:center;flex:none}
.zy-tab{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding:6px 1px 8px;font:inherit;font-size:13px;line-height:20px;box-shadow:inset 0 -2px 0 transparent;cursor:pointer;white-space:nowrap}
.zy-tab:hover,.zy-tab.is-on{color:var(--dsw-alias-label-primary)}
.zy-tab.is-on{box-shadow:inset 0 -2px 0 var(--dsw-alias-label-primary)}
.zy-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.zy-note{margin:0;color:var(--dsw-alias-state-error-primary);font-size:13px;display:flex;align-items:center;gap:6px}
.zy-lib{flex:1;min-height:0;display:grid;grid-template-columns:168px minmax(0,1fr)}
.zy-lib.is-empty{grid-template-columns:1fr}
.zy-list,.zy-cab{border:1px solid var(--dsw-alias-border-l2);min-height:0}
.zy-list{border-radius:12px 0 0 12px;border-right:none;display:flex;flex-direction:column;padding:4px 4px 6px}
.zy-cab{border-radius:0 12px 12px 0;padding:0;display:flex;flex-direction:column}
.zy-lib.is-empty .zy-cab{border-radius:12px;justify-content:center;align-items:center;border-left:1px solid var(--dsw-alias-border-l2)}
.zy-row{position:relative;border-radius:12px}
.zy-row:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}
.zy-row.is-on,.zy-row.is-on:hover{background:var(--dsw-specific-sidebar-nav-item-active)}
.zy-base{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 28px 8px 10px;border-radius:12px;color:inherit;font:inherit;font-weight:500}
.zy-del{width:22px;height:22px;border:none;background:transparent;border-radius:6px;padding:0;color:var(--dsw-alias-label-tertiary);display:inline-flex;align-items:center;justify-content:center;opacity:0;flex:none;cursor:pointer}
.zy-row .zy-del{position:absolute;right:6px;top:8px}
.zy-row:hover .zy-del,.zy-file:hover .zy-del,.zy-tree summary:hover .zy-del,.zy-del:focus{opacity:1}
.zy-del:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}
.zy-ghost{margin-top:auto;border:1px dashed var(--dsw-alias-border-l2);background:transparent;border-radius:12px;padding:8px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.zy-ghost:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-cab-head{display:flex;align-items:center;gap:10px;padding:8px 12px 6px}
.zy-cab-head>div:first-child{min-width:0;flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.zy-cab-head h2{margin:0;font-size:15px;font-weight:500;line-height:22px}
.zy-sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-actions{margin-left:auto;display:flex;gap:8px;flex:none}
.zy-btn,.zy-ghost,.zy-icon,.zy-tab,.zy-del,.zy-base,.zy-selector,.zy-box,.zy-area{appearance:none}
.zy-btn{height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);border-radius:16px;font:inherit;font-size:13px;color:inherit;cursor:pointer}
.zy-btn:hover{background:var(--dsw-alias-button-floating-hover)}
.zy-btn:disabled{opacity:.5;cursor:not-allowed}
.zy-primary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground)}
.zy-primary:hover{background:var(--dsw-alias-button-primary-hover)}
.zy-danger{border-color:var(--dsw-alias-state-error-secondary);background:transparent;color:var(--dsw-alias-state-error-primary)}
.zy-danger:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.zy-door{margin:0 10px 4px;background:var(--dsw-alias-bg-module-platform);border-radius:10px;font-size:12px;line-height:18px;flex:none}
.zy-door>summary{cursor:pointer;list-style:none;padding:6px 10px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:6px}
.zy-door>summary::-webkit-details-marker,.zy-door>summary::marker,.zy-tree summary::-webkit-details-marker,.zy-tree summary::marker{display:none;content:none}
.zy-door>summary:hover{color:var(--dsw-alias-label-primary)}
.zy-twist{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .15s cubic-bezier(.4,0,.2,1)}
details[open]>summary>.zy-twist{transform:rotate(90deg)}
.zy-door-body{padding:0 10px 8px}
.zy-tree{flex:1;min-height:0;overflow:auto;padding:2px 8px 8px}
.zy-tree details{padding-left:10px}
.zy-tree>details{padding-left:0}
.zy-tree summary{cursor:pointer;list-style:none;padding:3px 8px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:6px}
.zy-tree summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-tree summary>span{flex:1;min-width:0}
.zy-file{display:grid;grid-template-columns:minmax(0,1fr) auto auto 22px;gap:12px;padding:3px 8px 3px 22px;border-radius:8px;font-size:13px;align-items:center}
.zy-file:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-file .meta,.zy-file .when{color:var(--dsw-alias-label-tertiary)}
.zy-file-open{border:0;background:transparent;text-align:left;color:inherit;font:inherit;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-foot{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-icon{width:32px;height:32px;margin-left:auto;border:none;background:transparent;border-radius:50%;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.zy-icon:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-empty{text-align:center;max-width:36ch;padding:24px 16px;color:var(--dsw-alias-label-tertiary)}
.zy-empty h2{margin:0;color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500}
.zy-empty p{margin:8px 0 0;font-size:13px;line-height:20px}
.zy-empty .zy-btn{margin-top:16px}
.zy-set-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.zy-set-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:24px}
.zy-set-title{font-size:14px;line-height:22px}
.zy-set-desc{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.zy-selector{display:inline-flex;align-items:center;gap:12px;height:36px;padding:0 14px;border:none;border-radius:18px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;font-size:14px;cursor:pointer;width:auto;box-sizing:border-box}
.zy-selector:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-num{width:120px;cursor:text}
.zy-chevron{flex:none}
.zy-parser{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:center;padding:10px 0;font-size:14px}
.zy-parser+.zy-parser{border-top:1px solid var(--dsw-alias-border-l2)}
.zy-parser.is-off{color:var(--dsw-alias-label-tertiary);pointer-events:none}
.zy-prefs-h{margin:0;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2);font-size:14px;font-weight:400;line-height:22px}
.zy-field{margin:0 0 12px}
.zy-field label{display:block;font-size:13px;margin-bottom:4px}
.zy-box,.zy-area{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:8px 12px;color:inherit;font:inherit}
.zy-box[readonly]{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform)}
.zy-area{min-height:72px;resize:vertical}
.zy-help{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.zy-checks{display:flex;flex-direction:column;gap:8px;margin:8px 0 12px;font-size:13px}
.zy-checks label{display:flex;align-items:center;gap:8px;cursor:pointer}
.zy-source{display:flex;gap:8px;margin-bottom:8px}
.zy-footbar{display:flex;justify-content:flex-end;gap:8px;width:100%}
.zy-footbar .zy-danger{margin-right:auto}
.zy-about{max-width:62ch}
.zy-about h3{margin:20px 0 8px;font-size:14px;font-weight:500}
.zy-about p,.zy-about li{margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.zy-about ol{margin:0 0 8px;padding-left:1.2em}
.zy-about code{font-family:var(--ds-font-family-code);font-size:12px;background:var(--dsw-alias-markdown-inline-code);border-radius:4px;padding:0 4px}
.zy-demo{background:var(--dsw-alias-bg-module-platform);border-radius:10px;padding:10px 12px;margin:0 0 8px}
.zy-q{font-size:13px;font-weight:500;line-height:20px}
.zy-a{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.zy-pre{white-space:pre-wrap;font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;max-height:min(60vh,520px);overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:8px 12px}
.zy-search-bar{display:flex;gap:8px;align-items:center;margin:0 0 12px}
.zy-search-bar .zy-box{flex:1;height:32px;border-radius:16px;padding:0 12px}
.zy-search-bar .zy-icon{margin-left:0}
.zy-search-hits{max-height:280px;overflow:auto;background:var(--dsw-alias-markdown-code-block);border-radius:8px;padding:8px 12px;font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.zy-search-hits mark,.zy-pre mark.zy-hl{background:var(--dsw-specific-bubble-highlight);color:inherit}
.zy-hit-line{display:block;width:100%;border:0;background:transparent;text-align:left;color:inherit;font:inherit;padding:2px 0;cursor:pointer}
.zy-hit-line:hover{color:var(--dsw-alias-label-primary)}
.zy-hit{width:100%;text-align:left;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1);margin:0 0 4px;color:inherit;font:inherit}
.zy-hit:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-src{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-bottom:2px}
.zy-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-quote{font-size:13px;line-height:20px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.zy-ntag{font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;background:var(--dsw-alias-markdown-citation);padding:0 5px;border-radius:4px;flex:none}
.zy :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-modal-wide{width:min(640px,calc(100% - 32px))}
.zy-modal-form{width:min(400px,calc(100% - 32px))}
`

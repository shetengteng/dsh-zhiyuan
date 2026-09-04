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
.zy{font:inherit;color:var(--dsw-alias-label-primary);height:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:8px}
.zy-head{display:flex;align-items:center;gap:16px;min-height:36px;flex:none}
.zy-head-title{display:flex;align-items:center;gap:8px;flex:1;min-width:0}
.zy-head-title svg{flex:none}
.zy-head-title h1{margin:0;font-size:18px;font-weight:600;line-height:24px}
.zy-tabs{display:flex;gap:16px;align-items:center;flex:none}
.zy-tab{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding:6px 1px 8px;font:inherit;font-size:13px;line-height:20px;box-shadow:inset 0 -2px 0 transparent;cursor:pointer;white-space:nowrap}
.zy-tab:hover,.zy-tab.is-on{color:var(--dsw-alias-label-primary)}
.zy-tab.is-on{box-shadow:inset 0 -2px 0 var(--dsw-alias-label-primary)}
.zy-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.zy-body.is-doc{display:block;overflow:auto}
.zy-note{margin:0;color:var(--dsw-alias-state-error-primary);font-size:13px;display:flex;align-items:center;gap:6px}
.zy-base-layout{flex:1;min-height:0;display:grid;grid-template-columns:168px minmax(0,1fr)}
.zy-base-layout.is-empty{grid-template-columns:1fr}
.zy-base-list,.zy-base-panel{border:1px solid var(--dsw-alias-border-l2);min-height:0}
.zy-base-list{border-radius:12px 0 0 12px;border-right:none;display:flex;flex-direction:column;padding:4px 4px 6px}
.zy-base-panel{border-radius:0 12px 12px 0;padding:0;display:flex;flex-direction:column}
.zy-base-layout.is-empty .zy-base-panel{border-radius:12px;justify-content:center;align-items:center;border-left:1px solid var(--dsw-alias-border-l2)}
.zy-base-row{position:relative;border-radius:12px}
.zy-base-row:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}
.zy-base-row.is-on,.zy-base-row.is-on:hover{background:var(--dsw-specific-sidebar-nav-item-active)}
.zy-base-select{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 28px 8px 10px;border-radius:12px;color:inherit;font:inherit;font-weight:500}
.zy-del{width:22px;height:22px;border:none;background:transparent;border-radius:6px;padding:0;color:var(--dsw-alias-label-tertiary);display:inline-flex;align-items:center;justify-content:center;opacity:0;flex:none;cursor:pointer}
.zy-base-row .zy-del{position:absolute;right:6px;top:8px}
.zy-base-row:hover .zy-del,.zy-file:hover .zy-del,.zy-tree summary:hover .zy-del,.zy-del:focus{opacity:1}
.zy-del:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}
.zy-ghost{margin-top:auto;border:1px dashed var(--dsw-alias-border-l2);background:transparent;border-radius:12px;padding:8px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.zy-ghost:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-base-head{display:flex;align-items:center;gap:10px;padding:8px 12px 6px}
.zy-base-head .zy-sub{flex:1;min-width:0}
.zy-sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-actions{margin-left:auto;display:flex;gap:8px;flex:none}
.zy-btn,.zy-ghost,.zy-icon,.zy-tab,.zy-del,.zy-base-select,.zy-selector,.zy-box,.zy-area{appearance:none}
.zy-btn{height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);border-radius:16px;font:inherit;font-size:13px;color:inherit;cursor:pointer}
.zy-btn:hover{background:var(--dsw-alias-button-floating-hover)}
.zy-btn:disabled{opacity:.5;cursor:not-allowed}
.zy-primary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground)}
.zy-primary:hover{background:var(--dsw-alias-button-primary-hover)}
.zy-danger:not(:disabled){border-color:var(--dsw-alias-state-error-primary);background:transparent;color:var(--dsw-alias-state-error-primary)}
.zy-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}
.zy-base-description{margin:0 10px 4px;background:var(--dsw-alias-bg-module-platform);border-radius:10px;font-size:12px;line-height:18px;flex:none}
.zy-base-description>summary{cursor:pointer;list-style:none;padding:6px 10px;color:var(--dsw-alias-label-secondary);display:flex;align-items:baseline;min-width:0}
.zy-base-summary{flex:0 1 auto;min-width:0;overflow:hidden;white-space:nowrap}
.zy-base-ellipsis{flex:none}
.zy-base-description>summary::-webkit-details-marker,.zy-base-description>summary::marker,.zy-tree summary::-webkit-details-marker,.zy-tree summary::marker{display:none;content:none}
.zy-base-description>summary:hover{color:var(--dsw-alias-label-primary)}
.zy-twist{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .15s cubic-bezier(.4,0,.2,1)}
details[open]>summary>.zy-twist{transform:rotate(90deg)}
.zy-base-description[open]>summary{display:block}
.zy-base-description[open] .zy-base-summary{display:block;white-space:normal;overflow:visible}
.zy-base-description[open] .zy-base-ellipsis{display:none}
.zy-base-description-body{padding:0 10px 8px}
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
.zy-num-field{display:inline-flex;align-items:center;gap:8px;flex:none}
.zy-num-field .zy-num{width:88px;height:36px;padding:0 12px;border-radius:18px;text-align:right;font-variant-numeric:tabular-nums}
.zy-num-unit{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;flex:none}
.zy-chevron{flex:none}
.zy-parser{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:center;padding:10px 0;font-size:14px}
.zy-parser+.zy-parser{border-top:1px solid var(--dsw-alias-border-l2)}
.zy-parser.is-off{color:var(--dsw-alias-label-tertiary);pointer-events:none}
.zy-prefs-h{margin:0;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2);font-size:14px;font-weight:400;line-height:22px}
.zy-field{margin:0 0 12px}
.zy-field label{display:block;font-size:13px;margin-bottom:4px}
.zy-box,.zy-area{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:8px 12px;color:inherit;font-family:inherit;font-size:13px;line-height:20px}
.zy-box[readonly]{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform)}
.zy-area{min-height:72px;resize:vertical}
.zy-help{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.zy-checks{display:flex;flex-direction:column;gap:8px;margin:8px 0 12px;font-size:13px}
.zy-checks label{display:flex;align-items:center;gap:8px;cursor:pointer}
.zy-source-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;box-sizing:border-box;min-height:108px;padding:14px 12px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;text-align:center;transition:background .15s,border-color .15s}
.zy-source-drop:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-source-drop.is-dragging{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary)}
.zy-source-copy,.zy-source-hint{pointer-events:none}
.zy-source-copy{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px;font-weight:500}
.zy-source-hint{margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-source-actions{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px}
.zy-source-action{height:28px;padding:0 10px;border-radius:14px;font-size:12px;line-height:20px;white-space:nowrap}
.zy-footbar{display:flex;justify-content:flex-end;gap:8px;width:100%}
.zy-footbar .zy-danger{margin-right:auto}
.zy-about{width:100%;box-sizing:border-box;padding-bottom:24px}
.zy-about h3{margin:20px 0 8px;font-size:14px;font-weight:500}
.zy-about p,.zy-about li{margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.zy-about ol{margin:0 0 8px;padding-left:1.2em}
.zy-about code{font-family:var(--ds-font-family-code);font-size:12px;background:var(--dsw-alias-markdown-inline-code);border-radius:4px;padding:0 4px}
.zy-demo{background:var(--dsw-alias-bg-module-platform);border-radius:10px;padding:10px 12px;margin:0 0 8px}
.zy-q{font-size:13px;font-weight:500;line-height:20px}
.zy-a{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.zy-pre{white-space:pre-wrap;font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;max-height:min(72vh,720px);overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 16px}
.zy-search-bar{display:flex;gap:8px;align-items:center;margin:0 0 12px}
.zy-search-bar .zy-box{flex:1;height:32px;border-radius:16px;padding:0 12px}
.zy-search-bar .zy-icon{margin-left:0}
.zy-search-hits{max-height:280px;overflow:auto;background:var(--dsw-alias-markdown-code-block);border-radius:8px;padding:8px 12px;font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.zy-search-hits mark,.zy-pre mark.zy-hl{background:var(--dsw-specific-bubble-highlight);color:inherit}
.zy-hit-line{display:block;width:100%;border:0;background:transparent;text-align:left;color:inherit;font:inherit;padding:2px 0;cursor:pointer}
.zy-hit-line:hover{color:var(--dsw-alias-label-primary)}
.zy-hit{width:100%;text-align:left;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1);margin:0 0 4px;color:inherit;font:inherit}
.zy-hit:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-hit.is-selected,.zy-hit.is-selected:hover{border-color:color-mix(in oklch,var(--dsw-alias-state-business-primary) 38%,var(--dsw-alias-border-l2));background:color-mix(in oklch,var(--dsw-alias-state-business-primary) 8%,var(--dsw-alias-bg-layer-1))}
.zy-src{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-bottom:2px}
.zy-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-quote{font-size:13px;line-height:20px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.zy-ntag{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:18px;font-family:var(--ds-font-family-code);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;line-height:18px;color:color-mix(in oklch,var(--dsw-alias-state-business-primary) 78%,var(--dsw-alias-label-primary));background:color-mix(in oklch,var(--dsw-alias-state-business-primary) 14%,var(--dsw-alias-bg-layer-1));border:1px solid color-mix(in oklch,var(--dsw-alias-state-business-primary) 22%,var(--dsw-alias-bg-layer-1));padding:0 5px;border-radius:4px;flex:none}
.zy :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-preview-panel{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.zy-preview-head{display:flex;align-items:flex-start;gap:12px;height:45px;min-height:45px;box-sizing:border-box;padding:12px 16px 0;border-bottom:1px solid transparent;position:relative;flex:none;overflow:hidden}
.zy-preview-head:after{content:"";z-index:0;background:var(--dsw-alias-border-l2);pointer-events:none;height:1px;position:absolute;bottom:1px;left:0;right:0}
.zy-preview-head-copy{min-width:0;flex:1}
.zy-preview-title{display:flex;align-items:center;gap:8px;flex:1;min-width:0;font-size:14px;font-weight:600;line-height:16px}
.zy-preview-filename{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-preview-close{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:20px;line-height:24px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none}
.zy-preview-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.zy-preview-location{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zy-preview-body{flex:1;min-height:0;overflow:auto;padding:0 16px 16px}
.zy-preview-body .zy-md{height:auto;min-height:0;border:0;border-radius:0;overflow:visible;background:transparent}
.zy-preview-body .zy-md-body{height:auto;min-height:0;max-height:none;overflow:visible;flex:none}
.zy-preview-body .zy-md-doc{min-height:0;padding:18px 6px 24px 0}
.zy-preview-body .zy-md-doc p{white-space:pre-wrap}
.zy-preview-status{padding:10px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-csv-preview{display:flex;flex-direction:column;min-height:0;height:100%}
.zy-csv-page-tools{display:flex;align-items:center;gap:8px;padding-top:10px}
.zy-csv-page-status{margin-right:auto;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}
.zy-csv-page-error{margin-top:8px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.zy-csv-grid{height:min(72vh,720px);min-height:280px;margin-top:10px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.zy-csv-table{height:100%}
.zy-csv-table table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;line-height:20px}
.zy-csv-table th,.zy-csv-table td{min-width:132px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l2);border-right:1px solid var(--dsw-alias-border-l2);vertical-align:top;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}
.zy-csv-table thead th{position:relative;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-weight:600}
.zy-csv-table .zy-csv-row-number{width:48px;min-width:48px;color:var(--dsw-alias-label-tertiary);text-align:right;font-variant-numeric:tabular-nums}
.zy-csv-table .zy-csv-row-focus{background:color-mix(in oklch,var(--dsw-alias-state-warn-primary) 18%,var(--dsw-alias-bg-layer-1))}
.zy-csv-cell-text{display:block;min-height:20px;color:var(--dsw-alias-label-primary)}
.zy-csv-cell-button{display:block;width:100%;min-height:20px;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;line-height:inherit;text-align:inherit;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text}
.zy-csv-cell-button:focus-visible,.zy-csv-cell-input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-csv-cell-input{box-sizing:border-box;display:block;width:100%;min-height:20px;padding:0;resize:vertical;border:0;border-radius:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;line-height:20px;outline:none;appearance:none}
.zy-csv-body{flex:1;min-height:280px;max-height:min(72vh,720px);overflow:auto;margin:10px 0 0;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;white-space:pre;tab-size:4}
.zy-preview-empty{margin:auto;max-width:28ch;padding:24px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.zy-preview-empty-title{color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:500;line-height:20px}
.zy-preview-empty p{margin:6px 0 0;font-size:12px;line-height:18px}
.zy-preview-panel :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-dialog-root{z-index:1100;justify-content:center;align-items:center;display:flex;position:fixed;inset:0;animation:zy-footer-in .15s var(--ds-ease-in-out,ease)}
.zy-dialog-mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}
.zy-dialog{z-index:1;position:relative;box-sizing:border-box;border:none;border-radius:16px;padding:0;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv3);max-height:calc(100vh - 32px)}
.zy-dialog-inner{box-sizing:border-box;padding:20px 20px 16px;position:relative;display:flex;flex-direction:column;min-height:0;max-height:calc(100vh - 32px)}
.zy-dialog-title{margin:0 0 14px;font-size:16px;font-weight:500;line-height:24px;padding-right:28px}
.zy-dialog-desc{margin:0 0 12px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.zy-dialog-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;border-radius:28px;padding:0;background:transparent;color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.zy-dialog-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-dialog-close:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-dialog-inner>.zy-footbar{margin-top:16px;flex:none}
.zy-modal-wide{width:min(960px,calc(100vw - 48px));max-width:960px;max-height:calc(100vh - 32px)}
.zy-modal-wide .zy-md-body{min-height:360px;max-height:min(72vh,720px)}
.zy-modal-wide .zy-csv-body,.zy-modal-wide .zy-csv-grid{min-height:360px}
.zy-modal-form{width:min(400px,calc(100% - 32px))}
.zy-md{display:flex;flex-direction:column;min-height:0;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.zy-md-bar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);flex:none}
.zy-md-tb{height:28px;min-width:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:20px;cursor:pointer}
.zy-md-tb:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-md-tb.is-on{background:var(--dsw-alias-interactive-bg-hover);font-weight:600}
.zy-md-sep{width:1px;height:16px;background:var(--dsw-alias-border-l2);margin:0 4px}
.zy-md-body{min-height:280px;max-height:min(52vh,520px);overflow:auto}
.zy-md-doc{outline:none;min-height:100%;padding:22px 22px 24px;font-size:14px;line-height:1.7}
.zy-md-doc p{margin:0 0 .75em}
.zy-md-doc h1{font-size:1.6em;margin:0 0 .5em;font-weight:600}
.zy-md-doc h2{font-size:1.3em;margin:1em 0 .4em;font-weight:600}
.zy-md-doc h3{font-size:1.1em;margin:1em 0 .35em;font-weight:600}
.zy-md-doc ul,.zy-md-doc ol{margin:0 0 .75em;padding-left:1.4em}
.zy-md-doc blockquote{margin:0 0 .75em;padding:0 0 0 12px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.zy-md-doc pre{margin:0 0 .75em;padding:10px 12px;border-radius:8px;overflow:auto;background:var(--dsw-alias-markdown-code-block);font-family:var(--ds-font-family-code);font-size:13px}
.zy-md-doc code{font-family:var(--ds-font-family-code);font-size:12px;background:var(--dsw-alias-markdown-inline-code);border-radius:4px;padding:0 4px}
.zy-md-doc pre code{background:transparent;padding:0;font-size:13px}
.zy-md-doc a{color:var(--dsw-alias-state-business-primary);text-decoration:underline}
.zy-md-doc hr{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:16px 0}
.zy-md-doc .zy-hl{background:color-mix(in oklch,var(--dsw-alias-state-warn-primary) 28%,var(--dsw-alias-bg-layer-1));border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.zy-md-doc span.zy-hl{padding:1px 2px}
.zy-footer-action{box-sizing:border-box;cursor:pointer;width:calc(100% + 4px);height:42px;margin:4px -2px -4px;padding:0 10px 0 8px;border:none;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;display:flex;align-items:center;gap:8px;overflow:hidden;flex:none}
.zy-footer-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-footer-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-footer-action.is-rail{width:36px;height:36px;margin:0 0 -8px;padding:0;border-radius:50%;justify-content:center;gap:0}
.zy-footer-action-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.zy-footer-overlay{z-index:1000;justify-content:center;align-items:center;display:flex;position:fixed;inset:0;animation:zy-footer-in .15s var(--ds-ease-in-out,ease)}
@keyframes zy-footer-in{0%{opacity:0}}
.zy-footer-mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}
.zy-footer-panel{z-index:1;box-sizing:border-box;position:relative;display:flex;flex-direction:column;width:800px;max-width:calc(100vw - 48px);height:min(800px,100vh - 48px);padding:20px 24px 24px;border-radius:24px;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv3);overflow:hidden}
.zy-footer-close{position:absolute;top:14px;right:14px;z-index:2;width:28px;height:28px;border:none;border-radius:28px;padding:0;background:transparent;color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.zy-footer-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-footer-close:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-footer-panel-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.zy-footer-panel-body .zy-head{padding-right:36px}
`

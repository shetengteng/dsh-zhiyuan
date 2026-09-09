export const WORKBENCH_CSS = `
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
.zy-note{margin:0;font-size:13px;display:flex;align-items:center;gap:6px}
.zy-note.is-success{color:var(--dsw-alias-state-business-primary)}
.zy-note.is-warning{color:var(--dsw-alias-state-warn-primary)}
.zy-note.is-error{color:var(--dsw-alias-state-error-primary)}
.zy-base-layout{flex:1;min-height:0;display:grid;grid-template-columns:168px minmax(0,1fr)}
.zy-base-layout.is-empty{grid-template-columns:1fr}
.zy-base-list,.zy-base-panel{border:1px solid var(--dsw-alias-border-l2);min-height:0}
.zy-base-list{border-radius:12px 0 0 12px;border-right:none;display:flex;flex-direction:column;padding:4px 4px 6px}
.zy-base-panel{border-radius:0 12px 12px 0;padding:0;display:flex;flex-direction:column}
.zy-base-layout.is-empty .zy-base-panel{border-radius:12px;justify-content:center;align-items:center;border-left:1px solid var(--dsw-alias-border-l2)}
.zy-base-row{position:relative;margin:2px 0;border-radius:12px}
.zy-base-row:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}
.zy-base-row.is-on,.zy-base-row.is-on:hover{background:var(--dsw-specific-sidebar-nav-item-active)}
.zy-base-select{display:flex;align-items:baseline;gap:4px;width:100%;border:0;background:transparent;text-align:left;padding:8px 28px 8px 10px;border-radius:12px;color:inherit;font:inherit;font-weight:500;overflow:hidden}
.zy-base-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-base-version{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:18px;font-variant-numeric:tabular-nums}
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
.zy-footbar>.zy-danger:first-child{margin-right:auto}
.zy-about{width:100%;box-sizing:border-box;padding-bottom:24px}
.zy-about h3{margin:20px 0 8px;font-size:14px;font-weight:500}
.zy-about p,.zy-about li{margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.zy-about ol{margin:0 0 8px;padding-left:1.2em}
.zy-about code{font-family:var(--ds-font-family-code);font-size:12px;background:var(--dsw-alias-markdown-inline-code);border-radius:4px;padding:0 4px}
.zy-demo{background:var(--dsw-alias-bg-module-platform);border-radius:10px;padding:10px 12px;margin:0 0 8px}
.zy-q{font-size:13px;font-weight:500;line-height:20px}
.zy-a{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.zy-pre{white-space:pre-wrap;font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;max-height:min(72vh,720px);overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 16px}
`

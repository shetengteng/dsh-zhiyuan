export const DIALOG_EDITOR_CSS = `
.zy-dialog-root{z-index:1100;justify-content:center;align-items:center;display:flex;position:fixed;inset:0;animation:zy-dialog-in .15s var(--ds-ease-in-out,ease)}
@keyframes zy-dialog-in{0%{opacity:0}}
.zy-dialog-mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}
.zy-dialog{z-index:1;position:relative;box-sizing:border-box;border:none;border-radius:16px;padding:0;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv3);max-height:calc(100vh - 32px)}
.zy-dialog-inner{box-sizing:border-box;padding:20px 20px 16px;position:relative;display:flex;flex-direction:column;min-height:0;max-height:calc(100vh - 32px)}
.zy-dialog-title{margin:0 0 14px;font-size:16px;font-weight:500;line-height:24px;padding-right:28px}
.zy-dialog-desc{margin:0 0 12px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.zy-dialog-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;border-radius:28px;padding:0;background:transparent;color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.zy-dialog-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-dialog-close:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-dialog-inner>.zy-footbar{margin-top:16px;flex:none}
.zy-modal-wide{width:min(960px,calc(100vw - 48px));max-width:960px;height:min(800px,calc(100vh - 48px));display:flex;flex-direction:column}
.zy-modal-wide .zy-dialog-inner{flex:1;min-height:0;height:100%;display:flex;flex-direction:column}
.zy-modal-wide .zy-preview-form{flex:1;min-height:0;display:flex;flex-direction:column}
.zy-modal-wide .zy-md-body{flex:1;min-height:0;max-height:none}
.zy-modal-wide .zy-csv-body{flex:1;min-height:0;max-height:none}
.zy-modal-wide .zy-csv-grid{flex:1;min-height:0;max-height:none}
.zy-modal-form-wide{width:min(640px,calc(100vw - 48px));max-width:640px}
.zy-modal-search{width:min(800px,calc(100vw - 48px));max-width:800px;height:min(640px,calc(100vh - 48px));display:flex;flex-direction:column}
.zy-modal-search .zy-dialog-inner{flex:1;width:100%;height:100%;min-height:0}
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
`

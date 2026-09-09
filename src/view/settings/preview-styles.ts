export const PREVIEW_CSS = `
.zy-preview-panel{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.zy-preview-head{display:flex;align-items:flex-start;gap:12px;height:76px;min-height:76px;box-sizing:border-box;padding:12px 16px 0;border-bottom:1px solid transparent;position:relative;flex:none;overflow:hidden}
.zy-preview-head:after{content:"";z-index:0;background:var(--dsw-alias-border-l2);pointer-events:none;height:1px;position:absolute;bottom:0;left:0;right:0}
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
.zy-preview-form{width:100%;min-width:0}
.zy-csv-preview{display:flex;flex-direction:column;width:100%;min-width:0;min-height:0;height:100%}
.zy-csv-page-tools{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;padding-top:10px}
.zy-csv-page-status{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}
.zy-csv-page-actions{grid-column:2;display:flex;align-items:center;gap:20px}
.zy-csv-page-button{appearance:none;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-state-business-primary);padding:4px 8px;font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.zy-csv-page-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.zy-csv-page-button:disabled{color:var(--dsw-alias-label-tertiary);cursor:not-allowed;opacity:.65}
.zy-csv-page-error{margin-top:8px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.zy-csv-grid{box-sizing:border-box;width:100%;max-width:100%;min-width:0;height:min(72vh,720px);min-height:280px;margin-top:10px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.zy-csv-table{height:100%;width:100%;min-width:0;overflow:auto}
.zy-csv-table table{width:max-content;min-width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;line-height:20px}
.zy-csv-table th,.zy-csv-table td{box-sizing:border-box;width:132px;min-width:132px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l2);border-right:1px solid var(--dsw-alias-border-l2);vertical-align:top;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}
.zy-csv-table thead th{position:relative;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-weight:600}
.zy-csv-table .zy-csv-row-number{width:48px;min-width:48px;color:var(--dsw-alias-label-tertiary);text-align:right;font-variant-numeric:tabular-nums}
.zy-csv-table .zy-csv-row-focus{background:color-mix(in oklch,var(--dsw-alias-state-warn-primary) 18%,var(--dsw-alias-bg-layer-1))}
.zy-csv-cell-text{display:block;min-height:20px;color:var(--dsw-alias-label-primary)}
.zy-csv-cell-button{display:block;width:100%;min-height:20px;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;line-height:inherit;text-align:inherit;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text}
.zy-csv-cell-button:focus-visible,.zy-csv-cell-input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-csv-cell-input{box-sizing:border-box;display:block;width:100%;height:20px;padding:0;resize:none;border:0;border-radius:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;line-height:20px;outline:none;appearance:none}
textarea.zy-csv-cell-input{overflow-y:auto}
.zy-csv-body{flex:1;min-height:280px;max-height:min(72vh,720px);overflow:auto;margin:10px 0 0;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;white-space:pre;tab-size:4}
.zy-preview-empty{margin:auto;max-width:28ch;padding:24px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.zy-preview-empty-title{color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:500;line-height:20px}
.zy-preview-empty p{margin:6px 0 0;font-size:12px;line-height:18px}
.zy-preview-panel :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
`

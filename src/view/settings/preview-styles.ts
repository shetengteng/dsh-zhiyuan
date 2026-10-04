export const PREVIEW_CSS = `
.zy-preview-panel{box-sizing:border-box;flex:auto;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.zy-preview-head{display:flex;align-items:center;height:38px;min-height:38px;box-sizing:border-box;padding:11px 16px;position:relative;flex:none;overflow:hidden}
.zy-preview-head:after{content:"";z-index:0;background:var(--dsw-alias-border-l2);pointer-events:none;height:1px;position:absolute;bottom:0;left:0;right:0}
.zy-preview-head-copy{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
.zy-preview-title{display:flex;align-items:center;gap:8px;flex:1;min-width:0;font-size:14px;font-weight:600;line-height:16px}
.zy-preview-filename{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-preview-location{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;white-space:nowrap}
.zy-preview-body{flex:1;min-height:0;overflow:auto;padding:0 16px 16px}
.zy-preview-body .zy-md{height:auto;min-height:0;border:0;border-radius:0;overflow:visible;background:transparent}
.zy-preview-body .zy-md-body{height:auto;min-height:0;max-height:none;overflow:visible;flex:none}
.zy-preview-body .zy-md-doc{min-height:0;padding:18px 6px 24px 0}
.zy-preview-body:has(> .zy-csv-preview){padding:0}
.zy-preview-body .zy-csv-grid{height:100%;min-height:0;margin-top:0;border:0;border-radius:0}
.zy-preview-body .zy-csv-body{height:100%;max-height:none;margin:0;border:0;border-radius:0;padding:0}
.zy-preview-body .zy-md-doc p{white-space:pre-wrap}
.zy-preview-status{padding:10px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-preview-form{width:100%;min-width:0}
.zy-csv-preview{display:flex;flex-direction:column;width:100%;min-width:0;min-height:0;height:100%}
.zy-csv-page-tools{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;padding-top:10px}
.zy-csv-page-status{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}
.zy-csv-page-actions{grid-column:3;justify-self:end;display:flex;align-items:center;gap:20px}
.zy-csv-page-button{appearance:none;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-state-business-primary);padding:4px 8px;font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.zy-csv-page-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.zy-csv-page-button:disabled{color:var(--dsw-alias-label-tertiary);cursor:not-allowed;opacity:.65}
.zy-csv-page-error{margin-top:8px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.zy-csv-grid{box-sizing:border-box;width:100%;max-width:100%;min-width:0;height:min(72vh,720px);min-height:280px;margin-top:10px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.zy-rdg-cell-editor{box-sizing:border-box;position:absolute;inset:0;width:100%;padding:0 6px;resize:none;border:2px solid var(--dsw-alias-state-business-primary);border-radius:0;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:calc(var(--rdg-row-height) - 5px);outline:none;appearance:none;white-space:nowrap;overflow-wrap:normal;overflow:auto;scrollbar-width:none;vertical-align:top}
.zy-rdg-cell-editor::-webkit-scrollbar{display:none}
.zy-rdg-header-input{box-sizing:border-box;width:100%;height:24px;padding:0 4px;border:1px solid var(--dsw-alias-state-business-primary);border-radius:4px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;outline:none}
.zy-rdg-header-button{display:block;width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-weight:600;line-height:inherit;text-align:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text}
.zy-csv-body{flex:1;min-height:280px;max-height:min(72vh,720px);overflow:auto;margin:10px 0 0;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;white-space:pre;tab-size:4}
.zy-preview-empty{margin:auto;max-width:28ch;padding:24px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.zy-preview-empty-title{color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:500;line-height:20px}
.zy-preview-empty p{margin:6px 0 0;font-size:12px;line-height:18px}
.zy-preview-panel :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-preview-rail{border:1px solid var(--dsw-alias-border-l2);margin-left:-8px;border-radius:0 12px 12px 0;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.zy-preview-rail .zy-preview-head{padding:5px 12px}
.zy-preview-rail .zy-preview-form{flex:1;min-height:0;display:flex;flex-direction:column}
.zy-preview-rail .zy-preview-form .zy-md{flex:1;min-height:0;border:0;border-radius:0}
.zy-preview-rail .zy-preview-form .zy-md-body{flex:1;min-height:0;max-height:none;overflow:auto}
.zy-preview-rail .zy-preview-form .zy-csv-preview{flex:1;min-height:0;height:auto}
.zy-preview-rail .zy-preview-form .zy-csv-grid{flex:1;min-height:0;max-height:none;height:auto;margin-top:10px}
.zy-preview-rail .zy-note{flex:none;padding:8px 16px 0}
.zy-preview-close{width:28px;height:28px;border:none;border-radius:14px;padding:0;background:transparent;color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.zy-preview-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-preview-close:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-preview-foot{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l2);flex:none}
`

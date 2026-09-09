export const SEARCH_CSS = `
.zy-search-bar{display:flex;gap:8px;align-items:center;margin:0 0 12px;flex:none}
.zy-search-bar .zy-box{flex:1;height:32px;border-radius:16px;padding:0 12px}
.zy-search-bar .zy-icon{margin-left:0}
.zy-search-body{flex:1;min-height:0;display:flex;flex-direction:column}
.zy-search-status{margin:0 0 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);flex:none}
.zy-search-body > .zy-search-status:only-child{margin:auto}
.zy-search-empty{margin:auto;max-width:32ch;padding:24px 8px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.zy-search-hits{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:2px 2px 8px}
.zy-search-hits .zy-hit{margin:0}
.zy-search-more{align-self:flex-start;flex:none;margin-top:4px}
.zy-search-pagination{display:flex;align-items:center;justify-content:center;gap:20px;flex:none;margin-top:4px;padding:4px 0}
.zy-search-page-button{appearance:none;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-state-business-primary);padding:4px 8px;font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.zy-search-page-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.zy-search-page-button:disabled{color:var(--dsw-alias-label-tertiary);cursor:not-allowed;opacity:.65}
.zy-search-card{min-height:0;display:flex;flex-direction:column;gap:6px}
.zy-search-files{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:2px}
.zy-search-file-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.zy-search-file-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-search-file-copy,.zy-search-detail-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.zy-search-file-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code);font-size:13px;color:var(--dsw-alias-label-primary)}
.zy-search-file-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-search-file-open{flex:none}
.zy-search-detail-head{display:flex;align-items:center;gap:10px;padding-bottom:4px}
.zy-search-back{flex:none}
.zy-search-file-header{padding:7px 10px;border-radius:8px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap}
.zy-search-error{padding:8px 10px;border-radius:8px;background:var(--dsw-alias-state-error-tertiary);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.zy-search-hits mark,.zy-pre mark.zy-hl{background:var(--dsw-specific-bubble-highlight);color:inherit}
.zy-hit{box-sizing:border-box;width:100%;display:flex;align-items:flex-start;gap:8px;text-align:left;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 12px;background:var(--dsw-alias-bg-layer-1);margin:0 0 4px;color:inherit;font:inherit}
.zy-hit:hover,.zy-hit:focus-within{background:var(--dsw-alias-interactive-bg-hover)}
.zy-hit-content{box-sizing:border-box;display:block;min-width:0;flex:1;width:100%;padding:0;border:0;border-radius:4px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.zy-hit-content:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-hit.is-selected,.zy-hit.is-selected:hover,.zy-hit.is-selected:focus-within{border-color:color-mix(in oklch,var(--dsw-alias-state-business-primary) 38%,var(--dsw-alias-border-l2));background:color-mix(in oklch,var(--dsw-alias-state-business-primary) 8%,var(--dsw-alias-bg-layer-1))}
.zy-src{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-bottom:2px}
.zy-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-hit-loc{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}
.zy-search-coverage{margin:2px 0 4px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-search-overview{margin:2px 0 6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-file-group{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.zy-file-group-head{display:flex;align-items:baseline;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-file-group-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code)}
.zy-file-group-count{flex:none;font-variant-numeric:tabular-nums}
.zy-file-group-header{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}
.zy-search-rest{margin:4px 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.zy-quote{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.zy-hit-fields{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:4px}
.zy-hit-field{display:inline-flex;align-items:baseline;gap:6px;min-width:0;max-width:100%}
.zy-hit-k{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;flex:none}
.zy-hit-v{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:24ch}
.zy-ntag{box-sizing:border-box;appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:18px;font-family:var(--ds-font-family-code);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;line-height:18px;color:color-mix(in oklch,var(--dsw-alias-state-business-primary) 78%,var(--dsw-alias-label-primary));background:color-mix(in oklch,var(--dsw-alias-state-business-primary) 14%,var(--dsw-alias-bg-layer-1));border:1px solid color-mix(in oklch,var(--dsw-alias-state-business-primary) 22%,var(--dsw-alias-bg-layer-1));padding:0 5px;border-radius:4px;flex:none}
.zy-ntag-button{cursor:pointer}
.zy-ntag-button:hover{background:color-mix(in oklch,var(--dsw-alias-state-business-primary) 22%,var(--dsw-alias-bg-layer-1))}
.zy-ntag-button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
`

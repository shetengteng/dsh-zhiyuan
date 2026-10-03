import { RDG_TEMPLATE_CSS } from './rdg-template-css.ts'

/**
 * 知源 CSV 表格（react-data-grid）的 DSW token 覆盖段。
 * rdg 是 headless 表格，颜色通过 --rdg-* 变量暴露；这里全部映射到 DSW alias token，
 * 使表格随壳主题变化，不出现纯黑纯白硬编码。
 */
export const RDG_CSS = `
${RDG_TEMPLATE_CSS}
/* —— 知源覆盖段：将 rdg 变量映射到 DSW token —— */
.zy-csv-grid .rdg{
  --rdg-color: var(--dsw-alias-label-primary);
  --rdg-border-color: var(--dsw-alias-border-l2);
  --rdg-background-color: var(--dsw-alias-bg-layer-1);
  --rdg-header-background-color: var(--dsw-alias-bg-module-platform);
  --rdg-header-draggable-background-color: var(--dsw-alias-bg-module-platform);
  --rdg-row-hover-background-color: var(--dsw-alias-interactive-bg-hover);
  --rdg-row-selected-background-color: color-mix(in oklch,var(--dsw-alias-state-business-primary) 12%,var(--dsw-alias-bg-layer-1));
  --rdg-row-selected-hover-background-color: color-mix(in oklch,var(--dsw-alias-state-business-primary) 18%,var(--dsw-alias-bg-layer-1));
  --rdg-selection-color: var(--dsw-alias-state-business-primary);
  --rdg-checkbox-color: var(--dsw-alias-state-business-primary);
  --rdg-checkbox-focus-color: var(--dsw-alias-state-business-primary);
  --rdg-font-size: 13px;
  --rdg-row-height: 33px;
  --rdg-header-row-height: 33px;
  block-size: 100%;
  border: 0;
  border-radius: 0;
  user-select: text;
}
.zy-csv-grid .rdg .rdg-cell{padding-inline:10px;white-space:nowrap;overflow-wrap:anywhere}
.zy-csv-grid .rdg .rdg-header-row .rdg-cell{font-weight:600;color:var(--dsw-alias-label-primary)}
.zy-rdg-rownum{color:var(--dsw-alias-label-tertiary);text-align:right;font-variant-numeric:tabular-nums;background-color:var(--dsw-alias-bg-layer-1)}
.zy-csv-grid .rdg .zy-csv-row-focus{background-color:color-mix(in oklch,var(--dsw-alias-state-warn-primary) 18%,var(--dsw-alias-bg-layer-1))}
`

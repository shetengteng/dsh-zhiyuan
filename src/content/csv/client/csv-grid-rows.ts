/** CSV 表格在 react-data-grid 中使用的行对象：行号字段 + 按列索引编码的单元格字段。 */
export type CsvGridRow = Record<string, string | number> & { readonly rowNumber: number }

/** 列索引转字段名；与 CsvGridRow 的键一致，避免把业务行号当单元格字段。 */
export function cellField(index: number): string {
  return `c${index}`
}

/** 把 Host 返回的一页行数组转换成网格行对象。 */
export function toGridRows(startRow: number, rows: readonly (readonly string[])[]): CsvGridRow[] {
  return rows.map((values, offset) => {
    const row: Record<string, string | number> = { rowNumber: startRow + offset }
    values.forEach((value, column) => {
      row[cellField(column)] = value
    })
    return row as CsvGridRow
  })
}

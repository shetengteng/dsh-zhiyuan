// XLSX 测试夹具：用最小编造 OOXML 包生成 .xlsx 字节，不依赖 Excel 或外部库。

import { buildOoxmlZip } from './ooxml-zip.ts'

const XML = Buffer.from.bind(Buffer)

const MAIN_NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
const R_NS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const SHEET_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
const WORKBOOK_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'

export function inlineTextCell(ref: string, text: string): string {
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`
}

export function numberCell(ref: string, value: string): string {
  return `<c r="${ref}"><v>${value}</v></c>`
}

/** 公式单元格；不传 cachedValue 时表示 Excel 未保存计算结果。 */
export function formulaCell(ref: string, formula: string, cachedValue?: string): string {
  return `<c r="${ref}"><f>${formula}</f>${cachedValue === undefined ? '' : `<v>${cachedValue}</v>`}</c>`
}

export function rowXml(index: number, cells: string, hidden = false): string {
  return `<row r="${index}"${hidden ? ' hidden="1"' : ''}>${cells}</row>`
}

export type XlsxSheetSpec = {
  name: string
  state?: 'visible' | 'hidden' | 'veryHidden'
  /** 声明范围；省略时由 SheetJS 按实际格子推导。 */
  dimension?: string
  /** 原始 <cols> 片段，用于隐藏列等结构。 */
  cols?: string
  rows: string[]
}

/** 把 sheet 描述拼成最小可解析的 .xlsx 字节。 */
export function buildXlsxWorkbook(sheets: XlsxSheetSpec[]): Buffer {
  const sheetEntries = sheets.map((sheet, index) => {
    const state = sheet.state === undefined ? '' : ` state="${sheet.state}"`
    return `<sheet name="${sheet.name}" sheetId="${index + 1}"${state} r:id="rId${index + 1}"/>`
  }).join('')
  const relEntries = sheets.map((_, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join('')
  const overrides = sheets.map((_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="${SHEET_CONTENT_TYPE}"/>`
  )).join('')

  const parts = [
    {
      name: '[Content_Types].xml',
      data: XML([
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
        `<Default Extension="xml" ContentType="application/xml"/>`,
        `<Override PartName="/xl/workbook.xml" ContentType="${WORKBOOK_CONTENT_TYPE}"/>`,
        overrides,
        `</Types>`,
      ].join(''), 'utf8'),
    },
    {
      name: '_rels/.rels',
      data: XML([
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`,
        `</Relationships>`,
      ].join(''), 'utf8'),
    },
    {
      name: 'xl/workbook.xml',
      data: XML([
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<workbook ${MAIN_NS} ${R_NS}><sheets>${sheetEntries}</sheets></workbook>`,
      ].join(''), 'utf8'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: XML([
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
        relEntries,
        `</Relationships>`,
      ].join(''), 'utf8'),
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: XML([
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<worksheet ${MAIN_NS}>`,
        sheet.dimension === undefined ? '' : `<dimension ref="${sheet.dimension}"/>`,
        sheet.cols === undefined ? '' : `<cols>${sheet.cols}</cols>`,
        `<sheetData>${sheet.rows.join('')}</sheetData>`,
        `</worksheet>`,
      ].join(''), 'utf8'),
    })),
  ]
  return buildOoxmlZip(parts)
}

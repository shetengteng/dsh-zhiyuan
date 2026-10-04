// DOCX 测试夹具：用最小编造 OOXML 包生成 .docx 字节，不依赖 Word 或外部库。
// ZIP 构造逻辑在 ooxml-zip.ts，与 XLSX 夹具共用。

export { buildOoxmlZip as buildDocxZip, type OoxmlPart as DocxPart } from './ooxml-zip.ts'

const XML = Buffer.from.bind(Buffer)

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const R_NS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

export function documentXml(body: string): Buffer {
  return XML([`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`, `<w:document ${W_NS} ${R_NS}><w:body>`, body, `<w:sectPr/></w:body></w:document>`].join(''), 'utf8')
}

export function stylesXml(styleDefs: string): Buffer {
  return XML([`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`, `<w:styles ${W_NS}>`, styleDefs, `</w:styles>`].join(''), 'utf8')
}

export function headingStyle(styleId: string, name: string): string {
  return `<w:style w:type="paragraph" w:styleId="${styleId}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/></w:style>`
}

export function numberingXml(): Buffer {
  const lvl = (ilvl: number, fmt: string, text: string): string =>
    `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/></w:lvl>`
  return XML([
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<w:numbering ${W_NS}>`,
    `<w:abstractNum w:abstractNumId="0">${lvl(0, 'bullet', '•')}${lvl(1, 'decimal', '%2.')}${lvl(2, 'decimal', '%3.')}</w:abstractNum>`,
    `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`,
    `</w:numbering>`,
  ].join(''), 'utf8')
}

export function relsXml(relationships: string): Buffer {
  return XML([
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    relationships,
    `</Relationships>`,
  ].join(''), 'utf8')
}

export const CONTENT_TYPES_XML = XML([
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
  `<Default Extension="xml" ContentType="application/xml"/>`,
  `<Default Extension="png" ContentType="image/png"/>`,
  `</Types>`,
].join(''), 'utf8')

export const ROOT_RELS_XML = relsXml(
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>`,
)

export function headingParagraph(styleId: string, text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`
}

export function textParagraph(text: string): string {
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`
}

export function styledRunParagraph(runs: string): string {
  return `<w:p>${runs}</w:p>`
}

export function plainRun(text: string): string {
  return `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`
}

export function boldRun(text: string): string {
  return `<w:r><w:rPr><w:b/></w:rPr><w:t>${text}</w:t></w:r>`
}

export function italicRun(text: string): string {
  return `<w:r><w:rPr><w:i/></w:rPr><w:t>${text}</w:t></w:r>`
}

export function listParagraph(text: string): string {
  return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`
}

export function tableXml(rows: string[][]): string {
  const row = (cells: string[], isHeader: boolean): string =>
    isHeader
      ? `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cells.map((cell) => `<w:tc><w:p><w:r><w:t>${cell}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`
      : `<w:tr>${cells.map((cell) => `<w:tc><w:p><w:r><w:t>${cell}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`
  return `<w:tbl>${rows.map((cells, index) => row(cells, index === 0)).join('')}</w:tbl>`
}

export function hyperlinkParagraph(relationshipId: string, text: string): string {
  return `<w:p><w:hyperlink r:id="${relationshipId}"><w:r><w:t>${text}</w:t></w:r></w:hyperlink></w:p>`
}

export function imageParagraph(relationshipId: string): string {
  return [
    `<w:p><w:r><w:pict>`,
    `<v:shape xmlns:v="urn:schemas-microsoft-com:vml" style="width:1pt;height:1pt">`,
    `<v:imagedata r:id="${relationshipId}"/>`,
    `</v:shape></w:pict></w:r></w:p>`,
  ].join('')
}

/** 1×1 透明 PNG，用于带图文档夹具。 */
export const SAMPLE_PNG: Buffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

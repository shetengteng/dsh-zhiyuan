// DOCX 测试夹具：用最小编造 OOXML 包生成 .docx 字节，不依赖 Word 或外部库。

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(data: Buffer): number {
  let crc = -1
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function zipEntry(name: string, data: Buffer, localOffset: number): { local: Buffer; central: Buffer } {
  const nameBytes = Buffer.from(name, 'utf8')
  const crc = crc32(data)
  const size = [data.length & 0xff, (data.length >>> 8) & 0xff, (data.length >>> 16) & 0xff, (data.length >>> 24) & 0xff]
  const crcBytes = [crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff]
  const nameLen = [nameBytes.length & 0xff, nameBytes.length >>> 8]
  const local = Buffer.concat([
    // 签名(4) + 所需版本(2) + 标志(2) + 方法(2) + 时间(2) + 日期(2) = 14 字节
    Buffer.from([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    Buffer.from(crcBytes),
    Buffer.from(size),
    Buffer.from(size),
    Buffer.from(nameLen),
    Buffer.from([0, 0]),
    nameBytes,
    data,
  ])
  return {
    local,
    central: Buffer.concat([
      // 签名(4) + 制造版本(2) + 所需版本(2) + 标志(2) + 方法(2) + 时间(2) + 日期(2) = 16 字节
      Buffer.from([0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      Buffer.from(crcBytes),
      Buffer.from(size),
      Buffer.from(size),
      Buffer.from(nameLen),
      // extra(2) + 注释(2) + 起始盘号(2) + 内部属性(2) + 外部属性(4) = 12 字节
      Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      // 本地头偏移(4)
      Buffer.from([
        localOffset & 0xff, (localOffset >>> 8) & 0xff, (localOffset >>> 16) & 0xff, (localOffset >>> 24) & 0xff,
      ]),
      nameBytes,
    ]),
  }
}

export type DocxPart = { name: string; data: Buffer }

/** 把内容部件打包成无压缩的 .docx（ZIP）字节。 */
export function buildDocxZip(parts: DocxPart[]): Buffer {
  let offset = 0
  const entries: { local: Buffer; central: Buffer }[] = []
  for (const part of parts) {
    const entry = zipEntry(part.name, part.data, offset)
    entries.push(entry)
    offset += entry.local.length
  }
  const localData = Buffer.concat(entries.map((entry) => entry.local))
  const centralData = Buffer.concat(entries.map((entry) => entry.central))
  const count = entries.length
  const eocd = Buffer.from([
    0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0,
    count & 0xff, count >>> 8, count & 0xff, count >>> 8,
    centralData.length & 0xff, (centralData.length >>> 8) & 0xff, (centralData.length >>> 16) & 0xff, (centralData.length >>> 24) & 0xff,
    localData.length & 0xff, (localData.length >>> 8) & 0xff, (localData.length >>> 16) & 0xff, (localData.length >>> 24) & 0xff,
    0, 0,
  ])
  return Buffer.concat([localData, centralData, eocd])
}

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

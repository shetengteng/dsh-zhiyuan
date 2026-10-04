// OOXML 测试夹具共用：用最小编造 ZIP 包生成 Office 文档字节，不依赖 Word/Excel 或外部库。

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

export type OoxmlPart = { name: string; data: Buffer }

/** 把内容部件打包成无压缩的 OOXML（ZIP）字节。 */
export function buildOoxmlZip(parts: OoxmlPart[]): Buffer {
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

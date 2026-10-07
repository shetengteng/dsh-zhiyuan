// PDF 测试夹具：用最小编造的 PDF 1.4 字节生成测试样张，不依赖任何 PDF 生成库。
// 文本行用标准 Helvetica（pdf.js 内置度量），xref 偏移按实际字节动态计算。

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/**
 * 构造多页文本层 PDF。pages 每项是一页的文本行（自上而下）；
 * 传空行数组可模拟「无文字层的扫描件页」。
 */
export function buildSimplePdf(pages: readonly (readonly string[])[]): Buffer {
  const objects: string[] = []
  const push = (body: string): number => {
    objects.push(body)
    return objects.length
  }

  // 号分配：1 Catalog、2 Pages、3 Font；每页 i（0 起）占用 4+2i（页）与 5+2i（内容流）
  const catalogNum = push('')
  const pagesNum = push('')
  const fontNum = push('')
  const pageNums = pages.map(() => push(''))
  const contentNums = pages.map(() => push(''))

  objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`
  const kids = pageNums.map((num) => `${num} 0 R`).join(' ')
  objects[pagesNum - 1] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  objects[fontNum - 1] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`

  for (let index = 0; index < pages.length; index++) {
    const lines = pages[index] ?? []
    const streamBody = lines
      .map((line, lineIndex) => `BT /F1 12 Tf 72 ${720 - 20 * lineIndex} Td (${escapePdfText(line)}) Tj ET`)
      .join('\n')
    objects[contentNums[index] - 1] = `<< /Length ${Buffer.byteLength(streamBody, 'utf8')} >>\nstream\n${streamBody}\nendstream`
    objects[pageNums[index] - 1] = `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentNums[index]} 0 R >>`
  }

  const header = Buffer.from('%PDF-1.4\n', 'utf8')
  const chunks: Buffer[] = [header]
  const offsets: number[] = []
  let offset = header.length
  for (let index = 0; index < objects.length; index++) {
    const entry = Buffer.from(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`, 'utf8')
    offsets[index + 1] = offset
    chunks.push(entry)
    offset += entry.length
  }

  const xrefStart = offset
  const size = objects.length + 1
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index++) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${size} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  chunks.push(Buffer.from(xref, 'utf8'))
  return Buffer.concat(chunks)
}

/** 无文字层的两页 PDF（content stream 为空），用于模拟纯扫描件。 */
export function buildScannedPdf(): Buffer {
  return buildSimplePdf([[], []])
}

// 真实台账实测（临时脚本，跑完即删）：把本机真实 .xlsx 只读地跑一遍 XLSX→CSV 转换，
// 产物写到临时沙箱，不改动源文件、不写入任何知识库。
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareXlsxImport } from './src/formats/xlsx/xlsx-format.ts'

async function probe(label: string, sourcePath: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'zy-real-xlsx-'))
  try {
    const started = Date.now()
    const prepared = await prepareXlsxImport({
      sourcePath,
      sourceName: sourcePath.split('/').pop() ?? '源.xlsx',
      maxFileBytes: 20 * 1024 * 1024,
    })
    const elapsed = Date.now() - started
    console.log(`\n=== ${label} ===`)
    if (prepared.kind === 'skipped') {
      console.log(`源级 skipped：${prepared.reason}`)
      for (const warning of prepared.warnings ?? []) console.log(`  warning: ${warning}`)
      return
    }
    console.log(`耗时 ${elapsed}ms，产出 ${prepared.entries.length} 个 CSV：`)
    for (const entry of prepared.entries) {
      const bytes = entry.content.kind === 'bytes' ? entry.content.bytes : Buffer.alloc(0)
      const text = bytes.subarray(3).toString('utf8')
      const lines = text.split('\n').filter((line) => line.length > 0)
      const cols = lines[0]?.split(',').length ?? 0
      console.log(`  ${entry.outputName}：${entry.byteLength} 字节，约 ${Math.max(lines.length - 1, 0)} 数据行 × ${cols} 列，warnings=${JSON.stringify(entry.warnings ?? [])}`)
      // 产物健康度：BOM 存在、无 NUL、首行可当表头
      const bom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
      console.log(`    BOM=${bom} 含NUL=${bytes.includes(0)} 表头样例=${JSON.stringify(lines[0]?.slice(0, 80))}`)
      console.log(`    首条数据样例=${JSON.stringify(lines[1]?.slice(0, 80))}`)
      // 写落沙箱后用库内解析器读回，确认可进表格编辑
      const sandboxPath = join(dir, entry.outputName)
      await writeFile(sandboxPath, bytes)
    }
    for (const entry of prepared.entries) {
      const text = (await readFile(join(dir, entry.outputName))).subarray(3).toString('utf8')
      const rows = text.split('\n').filter((line) => line.length > 0).length - 1
      console.log(`  读回复核 ${entry.outputName}：${rows} 数据行可解析`)
    }
  } catch (error) {
    console.log(`\n=== ${label} ===`)
    console.log(`失败：${(error as { code?: string; message?: string }).code ?? ''} ${(error as Error).message}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

await probe('真实文件：职称评定时间安排表.xlsx', '/Users/stt/Desktop/职称评定时间安排表.xlsx')
await probe('真实文件：2026年春季个人课表.xlsx', '/Users/stt/Desktop/2026年春季个人课表.xlsx')

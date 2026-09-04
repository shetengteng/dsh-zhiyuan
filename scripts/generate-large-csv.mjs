import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_MIB = 4.5
const CSV_HARD_LIMIT_MIB = 20
const DEFAULT_PREFS_MIB = 5

const SUPPLIERS = [
  '上海甲乙丙贸易有限公司',
  '深圳启明供应链',
  '杭州云栖办公耗材',
  '北京北辰设备',
  '苏州吴门精密',
  '成都锦官物流',
  '广州珠江包装',
  '南京金陵机电',
  '武汉江城电子',
  '西安长安配件',
]
const CATEGORIES = ['办公耗材', '服务器配件', '网络设备', '包装材料', '检测仪器', '差旅服务']
const STATUSES = ['履行中', '已验收', '待续签', '已终止']
const OWNERS = ['张三', '李四', '王五', '赵六', '陈七']
const HEADER = ['合同编号', '供应商', '品类', '金额', '币种', '签订日期', '到期日', '状态', '经办人', '备注']

function parseTargetBytes(argv) {
  const mibFlag = argv.find((item) => item.startsWith('--mib='))
  const mib = mibFlag ? Number(mibFlag.slice('--mib='.length)) : DEFAULT_MIB
  if (!Number.isFinite(mib) || mib <= 0 || mib > CSV_HARD_LIMIT_MIB) {
    throw new Error(`--mib 必须在 0 到 ${CSV_HARD_LIMIT_MIB} 之间`)
  }
  return Math.floor(mib * 1024 * 1024)
}

function csvField(value) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

function formatDate(serial) {
  const day = (serial % 28) + 1
  const month = (serial % 12) + 1
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function remark(index, supplier) {
  if (index % 17 === 0) return `含运费,发票随货；对接人见附件`
  if (index % 23 === 0) return `续签前需核对 ${supplier} 对账单`
  if (index % 41 === 0) return `验收标准见「质量条款」`
  return '常规采购'
}

function buildRow(index) {
  const supplier = SUPPLIERS[index % SUPPLIERS.length]
  const signed = formatDate(index)
  const expire = formatDate(index + 180)
  const amount = ((index % 97) + 1) * 1280.5
  return [
    `HT-2026-${String(index).padStart(6, '0')}`,
    supplier,
    CATEGORIES[index % CATEGORIES.length],
    amount.toFixed(2),
    'CNY',
    signed,
    expire,
    STATUSES[index % STATUSES.length],
    OWNERS[index % OWNERS.length],
    remark(index, supplier),
  ].map(csvField).join(',')
}

const targetBytes = parseTargetBytes(process.argv.slice(2))
const chunks = [`${HEADER.join(',')}\n`]
let bytes = Buffer.byteLength(chunks[0], 'utf8')
let rows = 0

while (bytes < targetBytes) {
  const line = `${buildRow(rows + 1)}\n`
  const lineBytes = Buffer.byteLength(line, 'utf8')
  if (bytes + lineBytes > targetBytes && rows > 0) break
  chunks.push(line)
  bytes += lineBytes
  rows += 1
}

const outputDir = join(root, '.local-test-data')
const outputPath = join(outputDir, '供应商台账.csv')
await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, chunks.join(''), 'utf8')

const mib = (bytes / (1024 * 1024)).toFixed(2)
const prefsHint = bytes > DEFAULT_PREFS_MIB * 1024 * 1024
  ? `超过默认单文件上限 ${DEFAULT_PREFS_MIB} MiB，导入前请把偏好 maxFileBytes 调到至少 ${bytes}。`
  : `低于默认单文件上限 ${DEFAULT_PREFS_MIB} MiB，可直接导入。`

console.log(`已写入 ${outputPath}`)
console.log(`行数 ${rows}（不含表头），体积 ${bytes} 字节（${mib} MiB）。${prefsHint}`)

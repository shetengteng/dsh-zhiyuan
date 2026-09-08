import type { SearchScanStopReason } from '../../../model/search-result.ts'

export type ScannerPerFileMatchLimit = number | 'unlimited'

export type ScannerInput = {
  rootDir: string
  /** 已由 Host 校验过的 ripgrep 正则表达式。 */
  terms: string[]
  /** 已由 Host 校验过的知识库根目录相对路径，可以是目录或文件。 */
  targetPath?: string
  /** 单文件命中数策略；未指定时使用概览扫描的默认上限。 */
  perFileMatchLimit?: ScannerPerFileMatchLimit
}

export type ScannerMatch = {
  path: string
  line: number
  columnByte: number
}

export type ScannerResult = {
  matches: ScannerMatch[]
  warnings: string[]
  complete: boolean
  stopReason?: SearchScanStopReason
}

export interface SearchScanner {
  scan(input: ScannerInput): Promise<ScannerResult>
}

export type ImportFileResponse = {
  relPath: string
  sourceRelPath: string
  destinationPath?: string
  status: 'copied' | 'skipped' | 'renamed' | 'failed'
  code?: 'ext_denied' | 'file_too_large' | 'quota' | 'path_escape' | 'csv_encoding_invalid' | 'csv_control_character' | 'csv_line_too_long' | 'encoding_unsupported' | 'xlsx_invalid' | 'io_failed'
  reason?: string
  writtenBytes?: number
  warnings?: string[]
}

/** 一次导入用例返回的可序列化结果。 */
export type ImportResponse = {
  kbId: string
  copied: string[]
  renamed: string[]
  skipped: number
  failed: number
  createdDirs: string[]
  files: ImportFileResponse[]
  warnings: string[]
}

/** 导入任务的实时进度快照，随任务状态端点轮询下发；files 为已产生的逐文件结果。 */
export type ImportProgress = {
  /** 源文件总数（XLSX 多 sheet 只算一个源文件）。 */
  total: number
  /** 已处理完的源文件数。 */
  processed: number
  /** 正在处理的源文件名；本文件处理完后的上报会清掉。 */
  current?: string
  files: ImportFileResponse[]
}

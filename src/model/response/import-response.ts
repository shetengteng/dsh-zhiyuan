export type ImportFileResponse = {
  relPath: string
  sourceRelPath: string
  destinationPath?: string
  status: 'copied' | 'skipped' | 'renamed' | 'failed'
  code?: 'ext_denied' | 'file_too_large' | 'quota' | 'path_escape' | 'csv_encoding_invalid' | 'csv_control_character' | 'csv_line_too_long' | 'encoding_unsupported' | 'io_failed'
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

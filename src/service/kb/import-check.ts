import { existsSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path'
import type { ImportFileResult } from '../../model/types.ts'

// 查：唯一命名、目标路径规则、来源缺失文案与错误码映射。

/** 目标目录已存在同名文件时，追加 -2 / -3 等后缀避免覆盖。 */
export function uniqueName(dir: string, name: string): string {
  const ext = extname(name)
  const stem = basename(name, ext)
  let next = name
  let n = 2
  while (existsSync(join(dir, next))) {
    next = `${stem}-${n}${ext}`
    n += 1
  }
  return next
}

/** 浏览器拖拽只给文件名时的判断：无路径分隔符、非 ~ 开头、非绝对路径。 */
export function looksBareName(sourcePath: string): boolean {
  const value = sourcePath.trim()
  return Boolean(value) && !value.includes('/') && !value.includes('\\') && !value.startsWith('~') && !isAbsolute(value)
}

export function missingSourceMessage(sourcePath: string): string {
  if (looksBareName(sourcePath)) {
    return `源路径不存在：${sourcePath}。浏览器只给出了文件名，请使用导入弹框中的拖拽区域，或点击选择按钮打开系统对话框`
  }
  return `源路径不存在：${sourcePath}`
}

/** 保留目录树时使用相对来源根的路径，否则只用文件名。 */
export function relativeSourcePath(sourceRoot: string, file: string, preserveTree: boolean): string {
  if (!preserveTree) return basename(file)
  return relative(sourceRoot, file).split(sep).join('/')
}

/** 转换产物在目标类目内的相对落点：多产物时保留来源子目录。 */
export function outputRelativePath(sourceRelativePath: string, sourceName: string, outputName: string): string {
  if (sourceRelativePath === sourceName) return outputName
  return join(dirname(sourceRelativePath), outputName).split(sep).join('/')
}

/** 判断 KbError.code 是否属于单文件导入失败码（可写入结果，不中断批次）。 */
export function isIngestFailureCode(code: string): code is NonNullable<ImportFileResult['code']> {
  return code === 'ext_denied'
    || code === 'file_too_large'
    || code === 'quota'
    || code === 'path_escape'
    || code === 'csv_encoding_invalid'
    || code === 'csv_control_character'
    || code === 'csv_line_too_long'
    || code === 'encoding_unsupported'
    || code === 'io_failed'
}

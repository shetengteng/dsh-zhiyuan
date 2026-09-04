import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { EntryPageContext, EntryWriteContext } from '../../host-contract.ts'
import type { TableEditorPage } from '../../api.ts'
import { KbError } from '../../../types.ts'

/** Markdown 写入唯一入口：只接受整文件替换。 */
export async function writeMarkdownContent(context: EntryWriteContext): Promise<void> {
  if (context.change.kind !== 'text') throw new KbError('read_only_format', '该文件不支持表格修改')
  await mkdir(dirname(context.absolutePath), { recursive: true })
  await writeFile(context.absolutePath, context.change.text, 'utf8')
}

/** Markdown 没有分页形态；保持通用契约的空实现。 */
export async function readMarkdownPage(context: EntryPageContext): Promise<TableEditorPage> {
  void context
  throw new KbError('read_only_format', '该文件不支持表格分页读取')
}

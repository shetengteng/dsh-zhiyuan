export type ToolResultContentBlock = {
  type?: string
  text?: string
}

export type ToolResultBlock = {
  kind?: string
  isError?: boolean
  content?: ToolResultContentBlock[]
  meta?: unknown
}

export function firstTextContent(content: ToolResultBlock['content']): string {
  if (!Array.isArray(content)) return ''
  for (const block of content) if (block?.type === 'text' && typeof block.text === 'string') return block.text
  return ''
}

import TurndownService from '@joplin/turndown'
import { strikethrough, tables } from '@joplin/turndown-plugin-gfm'

/**
 * HTML → Markdown 的输出策略：GFM 表格 / 删除线、链接协议 allowlist、
 * 剔除图片与原始 HTML。与具体文档格式解耦，DOCX 子进程是当前唯一调用方。
 */

/** 允许保留的超链接协议；无协议相对链接与其余协议一律丢弃（只保留链接文字）。 */
const ALLOWED_LINK_PROTOCOLS: readonly string[] = ['https:', 'mailto:']

const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

/** 不保留内容的危险与媒体标签：显式规则剔除（该 fork 的 remove 压不过内建 image 规则）。 */
const STRIPPED_TAGS: readonly string[] = ['img', 'picture', 'figure', 'script', 'style', 'iframe', 'object', 'embed', 'video', 'audio']

export type HtmlMarkdownResult = {
  markdown: string
  /** 因协议不在 allowlist 或相对链接被丢弃的数量，供 warnings 汇总。 */
  droppedLinkCount: number
}

function isAllowedHref(href: string): boolean {
  const match = SCHEME_PATTERN.exec(href.trim())
  if (!match) return false
  return ALLOWED_LINK_PROTOCOLS.includes(match[0].toLowerCase())
}

function markdownLink(content: string, href: string): string {
  const escaped = href.replace(/([()])/g, '\\$1')
  const text = content.trim() || href
  return `[${text}](${escaped})`
}

/** 把 mammoth 产出的语义 HTML 转成受控 Markdown；不允许的链接只留文字。 */
export function convertHtmlToMarkdown(html: string): HtmlMarkdownResult {
  const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '*', bulletListMarker: '-' })
  service.use([tables, strikethrough])
  service.addRule('zy-strip-elements', {
    filter: [...STRIPPED_TAGS],
    replacement: () => '',
  })

  let droppedLinkCount = 0
  service.addRule('zy-link-allowlist', {
    filter: (node) => node.nodeName === 'A',
    replacement: (content, node) => {
      const href = node.getAttribute('href')
      if (!href || !isAllowedHref(href)) {
        droppedLinkCount += 1
        return content
      }
      return markdownLink(content, href)
    },
  })

  return { markdown: service.turndown(html), droppedLinkCount }
}

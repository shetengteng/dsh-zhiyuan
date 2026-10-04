/** @joplin/turndown 与 GFM 插件的最小类型声明：只覆盖 DOCX 转换用到的表面。 */

declare module '@joplin/turndown' {
  /** turndown 规则回调里用到的最小 DOM 节点面。 */
  export interface TurndownNode {
    nodeName: string
    nodeValue: string | null
    getAttribute(name: string): string | null
    hasAttribute(name: string): boolean
    childNodes: TurndownNode[]
    isBlock?: boolean
    isCode?: boolean
  }

  export type TurndownRule = {
    filter: string | string[] | ((node: TurndownNode) => boolean)
    replacement: (content: string, node: TurndownNode) => string
  }

  export type TurndownOptions = {
    headingStyle?: 'setext' | 'atx'
    codeBlockStyle?: 'indented' | 'fenced'
    bulletListMarker?: '-' | '+' | '*'
    emDelimiter?: '_' | '*'
    strongDelimiter?: '**' | '__'
    linkStyle?: 'inlined' | 'referenced'
  }

  export default class TurndownService {
    constructor(options?: TurndownOptions)
    turndown(html: string): string
    use(plugin: unknown | unknown[]): void
    addRule(key: string, rule: TurndownRule): void
    remove(filter: string | string[]): void
  }
}

declare module '@joplin/turndown-plugin-gfm' {
  export function tables(service: unknown): void
  export function strikethrough(service: unknown): void
}

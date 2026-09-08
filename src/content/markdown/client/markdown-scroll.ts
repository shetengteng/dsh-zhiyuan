import { normalizeMarkdownLine, sourceLineOccurrence } from './markdown-highlight.ts'

export function scrollToSnippet(
  documentRoot: HTMLElement,
  snippet: string,
  sourceText: string,
  focusLine?: number,
): (() => void) | undefined {
  const needle = snippet.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  if (!needle) return

  const normalizedNeedle = normalizeMarkdownLine(needle)
  if (!normalizedNeedle) return
  const occurrence = sourceLineOccurrence(sourceText, focusLine, normalizedNeedle)
  const match = findTextOccurrence(documentRoot, normalizedNeedle, occurrence)
    ?? findTextOccurrence(documentRoot, normalizedNeedle, 0)
  if (match) {
    const mark = document.createElement('span')
    mark.className = 'zy-hl'
    const range = document.createRange()
    range.setStart(match.node, match.start)
    range.setEnd(match.node, match.start + normalizedNeedle.length)
    range.surroundContents(mark)
    return scrollMarkIntoView(mark, documentRoot)
  }

  const blocks = Array.from(documentRoot.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre'))
    .filter((element) => normalizeMarkdownLine(element.textContent ?? '').includes(normalizedNeedle))
  const block = blocks[occurrence] ?? blocks[0]
  if (!block) return
  block.classList.add('zy-hl')
  return scrollMarkIntoView(block, documentRoot)
}

function scrollMarkIntoView(mark: Element, documentRoot: HTMLElement): () => void {
  let disposed = false
  let frame: number | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  const sync = () => {
    if (disposed) return
    if (!mark.isConnected) return
    const scroller = findScrollContainer(documentRoot)
    if (!scroller) {
      mark.scrollIntoView({ block: 'center', inline: 'nearest' })
      return
    }

    const scrollerRect = scroller.getBoundingClientRect()
    const markRect = mark.getBoundingClientRect()
    const targetTop = scroller.scrollTop
      + markRect.top
      - scrollerRect.top
      - (scroller.clientHeight - markRect.height) / 2
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    scroller.scrollTop = Math.min(Math.max(0, targetTop), maxTop)
  }

  sync()
  if (typeof requestAnimationFrame !== 'undefined') {
    let frames = 0
    const settle = () => {
      if (disposed) return
      sync()
      frames += 1
      if (frames < 3) frame = requestAnimationFrame(settle)
    }
    frame = requestAnimationFrame(settle)
  }
  if (typeof setTimeout !== 'undefined') timeout = setTimeout(sync, 120)
  return () => {
    disposed = true
    if (frame !== undefined && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
    if (timeout !== undefined && typeof clearTimeout !== 'undefined') clearTimeout(timeout)
  }
}

function findScrollContainer(root: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = root
  while (current) {
    const style = getComputedStyle(current)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return current
    }
    current = current.parentElement
  }
  return null
}

function findTextMatch(text: string, needle: string): number {
  return text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
}

function findTextOccurrence(root: HTMLElement, needle: string, occurrence: number): { node: Text; start: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let matches = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (!(node instanceof Text)) continue
    const text = node.textContent ?? ''
    let offset = 0
    while (offset <= text.length) {
      const relativeStart = findTextMatch(text.slice(offset), needle)
      if (relativeStart === -1) break
      const start = offset + relativeStart
      if (matches === occurrence) return { node, start }
      matches += 1
      offset = start + Math.max(1, needle.length)
    }
  }
  return null
}

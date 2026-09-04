import { Editor } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { EntryWriteChange } from '../../api.ts'

export type TiptapEditorHandle = {
  getText: () => string
}
export type MdEditorHandle = {
  getChange: () => EntryWriteChange | undefined
}

export type TiptapEditorProps = {
  text: string
  readonly: boolean
  startLine?: number
  endLine?: number
  focusLine?: number
  highlightText?: string
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(function TiptapEditor(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [tick, setTick] = useState(0)

  useImperativeHandle(ref, () => ({
    getChange: () => ({ kind: 'text' as const, text: editorRef.current?.getMarkdown() ?? props.text }),
  }), [props.text])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const instance = new Editor({
      element: host,
      extensions: [
        StarterKit,
        Markdown,
        Link.configure({ openOnClick: false, autolink: true, markdownLinks: true }),
      ],
      content: props.text,
      contentType: 'markdown',
      editable: !props.readonly,
      autofocus: props.readonly ? false : 'start',
      editorProps: { attributes: { class: 'zy-md-doc' } },
    })
    editorRef.current = instance
    setEditor(instance)
    const bump = () => setTick((n) => n + 1)
    instance.on('selectionUpdate', bump)
    instance.on('update', bump)
    const snippet = props.highlightText?.trim() || hitSnippet(props.text, props.focusLine ?? props.startLine, props.endLine)
    let cancelPositioning: (() => void) | undefined
    let positionFrame: number | undefined
    if (snippet) {
      const position = () => {
        cancelPositioning = scrollToSnippet(instance.view.dom, snippet, props.text, props.focusLine ?? props.startLine)
      }
      if (typeof requestAnimationFrame !== 'undefined') positionFrame = requestAnimationFrame(position)
      else position()
    }
    return () => {
      if (positionFrame !== undefined && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(positionFrame)
      cancelPositioning?.()
      instance.off('selectionUpdate', bump)
      instance.off('update', bump)
      instance.destroy()
      editorRef.current = null
      setEditor(null)
    }
  }, [props.text, props.readonly, props.startLine, props.endLine, props.focusLine, props.highlightText])

  return (
    <div className={props.readonly ? 'zy-md is-ro' : 'zy-md'}>
      {props.readonly || !editor ? null : <MdToolbar editor={editor} tick={tick} />}
      <div className="zy-md-body" ref={hostRef} />
    </div>
  )
})

export const MdEditor = TiptapEditor

function MdToolbar(props: { editor: Editor; tick: number }) {
  const { editor } = props
  void props.tick
  return (
    <div className="zy-md-bar" role="toolbar">
      <ToolbarButton label="B" title="加粗" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton label="I" title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton label="S" title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="zy-md-sep" />
      <ToolbarButton label="H1" title="一级标题" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarButton label="H2" title="二级标题" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton label="H3" title="三级标题" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="zy-md-sep" />
      <ToolbarButton label="•" title="无序列表" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton label="1." title="有序列表" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton label="“" title="引用" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton label="</>" title="代码块" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
    </div>
  )
}

function ToolbarButton(props: { label: string; title: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={props.active ? 'zy-md-tb is-on' : 'zy-md-tb'} title={props.title} onClick={props.onClick}>
      {props.label}
    </button>
  )
}

function hitSnippet(text: string, startLine?: number, endLine?: number): string {
  if (!startLine || startLine < 1) return ''
  const lines = text.split(/\r?\n/)
  const first = Math.min(startLine, lines.length)
  const lastLine = Math.min(endLine && endLine >= first ? endLine : first, lines.length)
  return lines.slice(first - 1, lastLine).join('\n').trim()
}

function scrollToSnippet(documentRoot: HTMLElement, snippet: string, sourceText: string, focusLine?: number): (() => void) | undefined {
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

function sourceLineOccurrence(sourceText: string, focusLine: number | undefined, needle: string): number {
  if (!focusLine || focusLine < 1) return 0
  const lines = sourceText.split(/\r?\n/)
  const before = lines.slice(0, Math.min(focusLine - 1, lines.length))
  return before.reduce((count, line) => count + countTextMatches(normalizeMarkdownLine(line), needle), 0)
}

function countTextMatches(text: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let offset = 0
  while (offset <= text.length) {
    const start = findTextMatch(text.slice(offset), needle)
    if (start === -1) return count
    count += 1
    offset += start + Math.max(1, needle.length)
  }
  return count
}

function normalizeMarkdownLine(value: string): string {
  return value
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?)/, '')
    .replace(/^\s*(?:[-+*]\s+|\d+[.)]\s+)/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

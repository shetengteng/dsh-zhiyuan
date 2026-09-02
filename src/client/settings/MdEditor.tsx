import { Editor } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type MdEditorHandle = { getMarkdown: () => string }

type MdEditorProps = {
  text: string
  readonly: boolean
  startLine?: number
  endLine?: number
  focusLine?: number
  highlightText?: string
}

export const MdEditor = forwardRef<MdEditorHandle, MdEditorProps>(function MdEditor(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [tick, setTick] = useState(0)

  useImperativeHandle(ref, () => ({
    getMarkdown: () => editorRef.current?.getMarkdown() ?? props.text,
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
    if (snippet) requestAnimationFrame(() => scrollToSnippet(instance.view.dom, snippet))
    return () => {
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

function scrollToSnippet(documentRoot: HTMLElement, snippet: string) {
  const needle = snippet.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  if (!needle) return

  const normalizedNeedle = normalizeMarkdownLine(needle)
  if (!normalizedNeedle) return
  const walker = document.createTreeWalker(documentRoot, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? ''
    const matchStart = findTextMatch(text, normalizedNeedle)
    if (matchStart === -1) continue
    const mark = document.createElement('span')
    mark.className = 'zy-hl'
    const range = document.createRange()
    range.setStart(node, matchStart)
    range.setEnd(node, matchStart + normalizedNeedle.length)
    range.surroundContents(mark)
    mark.scrollIntoView({ block: 'center', inline: 'nearest' })
    return
  }

  const block = Array.from(documentRoot.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre'))
    .find((element) => normalizeMarkdownLine(element.textContent ?? '').includes(normalizedNeedle))
  if (!block) return
  block.classList.add('zy-hl')
  block.scrollIntoView({ block: 'center', inline: 'nearest' })
}

function findTextMatch(text: string, needle: string): number {
  return text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
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

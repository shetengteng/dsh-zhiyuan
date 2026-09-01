import { Editor } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type MdEditorHandle = { getMarkdown: () => string }

type Props = {
  text: string
  readonly: boolean
  startLine?: number
  endLine?: number
}

export const MdEditor = forwardRef<MdEditorHandle, Props>(function MdEditor(props, ref) {
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
    const snippet = hitSnippet(props.text, props.startLine, props.endLine)
    if (snippet) requestAnimationFrame(() => scrollToSnippet(instance.view.dom, snippet))
    return () => {
      instance.off('selectionUpdate', bump)
      instance.off('update', bump)
      instance.destroy()
      editorRef.current = null
      setEditor(null)
    }
  }, [props.text, props.readonly, props.startLine, props.endLine])

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
      <Tb label="B" title="加粗" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Tb label="I" title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Tb label="S" title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="zy-md-sep" />
      <Tb label="H1" title="一级标题" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <Tb label="H2" title="二级标题" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Tb label="H3" title="三级标题" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="zy-md-sep" />
      <Tb label="•" title="无序列表" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Tb label="1." title="有序列表" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Tb label="“" title="引用" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Tb label="</>" title="代码块" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
    </div>
  )
}

function Tb(props: { label: string; title: string; active: boolean; onClick: () => void }) {
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
  const last = Math.min(endLine && endLine >= first ? endLine : first, lines.length)
  return lines.slice(first - 1, last).join('\n').trim()
}

function scrollToSnippet(root: HTMLElement, snippet: string) {
  const needle = snippet.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  if (!needle) return
  const probe = needle.slice(0, Math.min(48, needle.length))
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (!(node.textContent ?? '').includes(probe)) continue
    const el = node.parentElement
    if (!el) break
    el.classList.add('zy-hl')
    el.scrollIntoView({ block: 'center' })
    break
  }
}

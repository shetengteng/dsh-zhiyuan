import { Editor } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { EntryWriteChange } from '../../api.ts'
import { MarkdownToolbar } from './MarkdownToolbar.tsx'
import { hitSnippet } from './markdown-highlight.ts'
import { scrollToSnippet } from './markdown-scroll.ts'

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

export const TiptapEditor = forwardRef<MdEditorHandle, TiptapEditorProps>(function TiptapEditor(props, ref) {
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
      {props.readonly || !editor ? null : <MarkdownToolbar editor={editor} tick={tick} />}
      <div className="zy-md-body" ref={hostRef} />
    </div>
  )
})

export const MdEditor = TiptapEditor

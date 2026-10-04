import type { Editor } from '@tiptap/core'
import type { ReactElement } from 'react'

export type MarkdownToolbarProps = {
  editor: Editor
  tick: number
}

export function MarkdownToolbar(props: MarkdownToolbarProps): ReactElement {
  const { editor } = props
  void props.tick
  return (
    <div className="zy-md-bar" role="toolbar">
      <ToolbarButton
        label="B"
        title="加粗"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="I"
        title="斜体"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="S"
        title="删除线"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <span className="zy-md-sep" />
      <ToolbarButton
        label="H1"
        title="一级标题"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="H2"
        title="二级标题"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        title="三级标题"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <span className="zy-md-sep" />
      <ToolbarButton
        label="•"
        title="无序列表"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="1."
        title="有序列表"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="“"
        title="引用"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        label="</>"
        title="代码块"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
    </div>
  )
}

type ToolbarButtonProps = {
  label: string
  title: string
  active: boolean
  onClick: () => void
}

function ToolbarButton(props: ToolbarButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={props.active ? 'zy-md-tb is-on' : 'zy-md-tb'}
      title={props.title}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  )
}

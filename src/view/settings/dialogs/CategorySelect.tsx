import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react'

/** 类目下拉选择：可从现有类目里选，也可直接输入新类目路径（留空 = 库根）。 */

type CategoryOption = {
  key: string
  label: string
  hint?: string
  apply: () => void
}

export function CategorySelect(props: {
  categories: string[]
  value: string
  onChange: (value: string) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  // 按当前输入过滤候选：子串匹配且排除与输入完全一致的项。
  const text = props.value.trim()
  const lowered = text.toLowerCase()
  const matches = props.categories.filter((category) => category !== text && category.toLowerCase().includes(lowered))
  const options: CategoryOption[] = [
    { key: 'root', label: '库根', hint: '留空，导入到根目录', apply: () => props.onChange('') },
    ...matches.map((category) => ({ key: category, label: category, apply: () => props.onChange(category) })),
  ]
  // 输入了不与现有类目重名的内容时，给出“新建”提示项；点击即沿用输入值。
  if (text && !props.categories.includes(text)) {
    options.push({ key: 'new', label: `使用新类目「${text}」`, apply: () => undefined })
  }

  const pick = (option: CategoryOption) => {
    option.apply()
    setOpen(false)
    setHighlight(-1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlight(-1)
        return
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setHighlight((current) => Math.max(-1, Math.min(options.length - 1, current + delta)))
      return
    }
    if (event.key === 'Enter' && open && highlight >= 0) {
      // 下拉打开且高亮了候选项时，回车确认候选而不是提交表单。
      event.preventDefault()
      const option = options[highlight]
      if (option) pick(option)
      return
    }
    if (event.key === 'Escape' && open) {
      // 第一段 Escape 只收起下拉，避免顺手关掉整个弹框。
      event.stopPropagation()
      setOpen(false)
      setHighlight(-1)
    }
  }

  const keepFocus = (event: MouseEvent) => event.preventDefault()

  return (
    <div className="zy-catselect">
      <input
        className="zy-box"
        name="destCategory"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="类目"
        placeholder="合同/2024"
        autoComplete="off"
        value={props.value}
        onChange={(event) => { props.onChange(event.target.value); setOpen(true); setHighlight(-1) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setHighlight(-1) }}
        onKeyDown={handleKeyDown}
      />
      {open ? (
        <div className="zy-catselect-menu" id={listId} role="listbox" aria-label="现有类目">
          {options.map((option, index) => (
            <button
              key={option.key}
              type="button"
              role="option"
              aria-selected={highlight === index}
              id={`${listId}-${index}`}
              className={`zy-catselect-item${highlight === index ? ' is-hl' : ''}`}
              onMouseDown={keepFocus}
              onClick={() => pick(option)}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="zy-catselect-label">{option.label}</span>
              {option.hint ? <span className="zy-catselect-hint">{option.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

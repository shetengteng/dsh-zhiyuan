declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode } from 'react'

  export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'toolbar'
  export function Button(props: {
    variant?: ButtonVariant
    size?: 'md' | 'sm'
    icon?: ReactNode
    className?: string
    children?: ReactNode
  } & ButtonHTMLAttributes<HTMLButtonElement>): ReactElement

  export function Pill(props: {
    active?: boolean
    className?: string
    children?: ReactNode
  } & ButtonHTMLAttributes<HTMLButtonElement>): ReactElement

  export function Input(props: {
    icon?: ReactNode
    className?: string
  } & InputHTMLAttributes<HTMLInputElement>): ReactElement

  export function Modal(props: {
    open: boolean
    onClose: () => void
    title: string
    closeLabel?: string
    description?: string
    children?: ReactNode
    footer?: ReactNode
    className?: string
    contentClassName?: string
    headless?: boolean
  }): ReactElement | null

  export interface MenuItem {
    id: string
    label: ReactNode
    disabled?: boolean
    icon?: ReactNode
    danger?: boolean
  }
  export type MenuEntry = MenuItem

  export function Menu(props: {
    open: boolean
    anchor: ReactNode
    items: readonly MenuEntry[]
    selectedId?: string
    onSelect: (id: string) => void
    onClose: () => void
    align?: 'start' | 'end'
    portal?: boolean
  }): ReactElement

  export function DisclosureRow(props: {
    icon: ReactNode
    title: string
    open: boolean
    expandable: boolean
    onToggle: () => void
    children?: ReactNode
    className?: string
  }): ReactElement

  export function Tooltip(props: {
    label: string
    side?: 'right' | 'bottom' | 'top'
    children: ReactElement
  }): ReactElement

  export interface IconProps {
    size?: number
    className?: string
  }
  export function IconChevronDownOutline14(props: IconProps): ReactElement
  export function IconSearchOutline16(props: IconProps): ReactElement
  export function IconFolderOpen16(props: IconProps): ReactElement
  export function IconWarningOutline16(props: IconProps): ReactElement
  export function IconQuestionOutline14(props: IconProps): ReactElement

  export function StateDot(props: {
    state: 'done' | 'warning' | 'ongoing' | 'error'
    size?: number
    className?: string
  }): ReactElement
}

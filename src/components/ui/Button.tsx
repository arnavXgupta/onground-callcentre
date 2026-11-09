import type { ButtonHTMLAttributes, ReactNode } from 'react'
import s from './ui.module.css'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: ReactNode
  block?: boolean
}

export default function Button({ variant = 'secondary', size = 'md', icon, block, className, children, ...rest }: Props) {
  const cls = [s.btn, s[variant], size === 'sm' && s.sm, block && s.block, className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {icon}
      {children}
    </button>
  )
}

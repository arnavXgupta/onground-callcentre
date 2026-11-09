import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import s from './ui.module.css'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Header band colour: plain (default) or the AI/purple band used by the Leads modal. */
  tone?: 'plain' | 'ai'
  /** Extra content between header and body (e.g. a pager bar). */
  toolbar?: ReactNode
}

/**
 * Native <dialog> opened with showModal(): focus trap, Esc, top layer and ::backdrop come free.
 * Mounted = open. Closing is the parent's job (onClose → unmount).
 */
export default function Modal({ title, subtitle, icon, onClose, children, footer, tone = 'plain', toolbar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d || d.open) return
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '') // jsdom
    return () => d.close?.()
  }, [])

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault() // Esc: let React decide
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // backdrop
      }}
    >
      <div className={s.panel}>
        <header className={`${s.head} ${tone === 'ai' ? s.headAi : ''}`}>
          {icon && <span className={s.headIcon}>{icon}</span>}
          <div className={s.headText}>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
            <IconX size={16} />
          </button>
        </header>
        {toolbar}
        <div className={s.body}>{children}</div>
        {footer && <footer className={s.foot}>{footer}</footer>}
      </div>
    </dialog>
  )
}

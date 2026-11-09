import type { ReactNode } from 'react'
import s from './ui.module.css'

export default function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className={s.pageHead}>
      <div>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <h1 className={s.pageTitle}>{title}</h1>
      </div>
      {children}
    </div>
  )
}

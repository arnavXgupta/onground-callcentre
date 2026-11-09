import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import s from './ui.module.css'

interface Props {
  page: number // 0-based
  pages: number
  onChange: (page: number) => void
  label?: string
}

export default function Pager({ page, pages, onChange, label = 'Page' }: Props) {
  return (
    <nav className={s.pager} aria-label="Pagination">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page">
        <IconChevronLeft size={16} />
      </button>
      <span className="tnum" aria-live="polite">
        {label} {page + 1} of {pages}
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
        <IconChevronRight size={16} />
      </button>
    </nav>
  )
}

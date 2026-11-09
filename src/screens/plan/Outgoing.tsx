import { useState } from 'react'
import Pager from '../../components/ui/Pager'
import { leads } from '../../data'
import LeadRow from './LeadRow'
import s from './Plan.module.css'

const PER_PAGE = 2
const ranked = [...leads].sort((a, b) => b.score - a.score)

export default function Outgoing() {
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const pages = Math.ceil(ranked.length / PER_PAGE)
  const visible = ranked.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <section aria-labelledby="outgoing-title">
      <div className={s.sectionHead}>
        <h2 id="outgoing-title">Planned outgoing calls</h2>
        <p>Ranked by lead attractiveness score. Open a lead for the full picture.</p>
      </div>
      <ul className={s.list}>
        {visible.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            open={openId === lead.id}
            onToggle={() => setOpenId((id) => (id === lead.id ? null : lead.id))}
          />
        ))}
      </ul>
      <Pager
        page={page}
        pages={pages}
        onChange={(p) => {
          setPage(p)
          setOpenId(null)
        }}
      />
    </section>
  )
}

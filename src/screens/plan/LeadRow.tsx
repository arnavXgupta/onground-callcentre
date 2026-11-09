import { useId } from 'react'
import { IconChevronDown, IconPhone } from '@tabler/icons-react'
import { useCall } from '../../calling/CallProvider'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import type { Lead } from '../../data/types'
import { formatINR, scoreTone } from '../../lib/format'
import s from './Plan.module.css'

interface Props {
  lead: Lead
  open: boolean
  onToggle: () => void
}

export default function LeadRow({ lead, open, onToggle }: Props) {
  const { call, place } = useCall()
  const detailId = useId()
  const busy = call.phase !== 'idle'
  const story = lead.journey.map((j) => j.text).join(' → ')

  return (
    <li className={s.row} data-open={open || undefined}>
      <button type="button" className={s.rowHead} aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
        <Avatar name={lead.name} initials={lead.initials} />
        <span className={s.rowMain}>
          <span className={s.rowTitle}>{lead.name}</span>
          <span className={s.rowMeta}>
            {lead.intent === 'browsing' ? 'Browsing' : 'Interested'}: {lead.productShort} · {formatINR(lead.price)}
          </span>
        </span>
        <span className={s.score} data-tone={scoreTone(lead.score)}>
          <span className="tnum">{lead.score}</span>
          <small>Score</small>
        </span>
        <IconChevronDown size={16} className={s.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div id={detailId} className={s.detail}>
          <div className={s.label}>Story so far</div>
          <p className={s.story}>{story || 'No history logged yet.'}</p>

          <div className={s.tiles}>
            <div className={s.tile}>
              <div className={s.label}>Preferred product</div>
              <strong>{lead.product}</strong>
            </div>
            <div className={s.tile}>
              <div className={s.label}>Cross-sell</div>
              <strong>
                {lead.crossSell.name} · {formatINR(lead.crossSell.price)}
              </strong>
            </div>
          </div>

          <div className={s.emi}>
            <div className={s.label}>EMI / financing</div>
            <p>{lead.emiNote}</p>
          </div>

          <Button
            variant="primary"
            block
            icon={<IconPhone size={16} />}
            disabled={busy}
            onClick={() => place({ name: lead.name, number: lead.phone, leadId: lead.id })}
          >
            {busy ? 'On a call' : 'Place call'}
          </Button>
        </div>
      )}
    </li>
  )
}

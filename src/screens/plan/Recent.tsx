import { useState } from 'react'
import { IconChevronRight, IconPhoneIncoming, IconPhoneOutgoing, IconPhoneX } from '@tabler/icons-react'
import { OUTCOME_TONE } from '../../calling/callLog'
import { useCallHistory } from '../../calling/history'
import Pill from '../../components/ui/Pill'
import { duration, formatWhen } from '../../lib/format'
import CallReview from './CallReview'
import s from './Plan.module.css'

const ICON = { incoming: IconPhoneIncoming, outgoing: IconPhoneOutgoing, missed: IconPhoneX }
const TYPE = { incoming: 'Incoming', outgoing: 'Outgoing', missed: 'Missed' }

export default function Recent() {
  const history = useCallHistory()
  const [reviewId, setReviewId] = useState<string | null>(null)
  const reviewing = history.find((c) => c.id === reviewId)

  return (
    <section aria-labelledby="recent-title">
      <div className={s.sectionHead}>
        <h2 id="recent-title">Recent calls</h2>
        <p>Tap a call to review it against SOP.</p>
      </div>

      {history.length === 0 ? (
        <p className={s.empty}>No calls yet.</p>
      ) : (
        <ul className={s.list}>
          {history.map((c) => {
            const Icon = ICON[c.direction]
            return (
              <li key={c.id} className={s.row}>
                <button type="button" className={s.rowHead} onClick={() => setReviewId(c.id)}>
                  <span className={s.typeIcon} data-dir={c.direction} title={TYPE[c.direction]}>
                    <Icon size={16} aria-hidden="true" />
                    <span className="sr-only">{TYPE[c.direction]} call:</span>
                  </span>
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>
                      {c.name}
                      {c.outcome && <Pill tone={OUTCOME_TONE[c.outcome]}>{c.outcome}</Pill>}
                    </span>
                    <span className={`${s.rowMeta} tnum`}>
                      {formatWhen(c.at)} · {c.direction === 'missed' ? 'Missed' : duration(c.durationSec)}
                    </span>
                  </span>
                  <IconChevronRight size={16} className={s.chevron} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {reviewing && <CallReview call={reviewing} onClose={() => setReviewId(null)} />}
    </section>
  )
}

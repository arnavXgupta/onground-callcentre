import { useMemo } from 'react'
import { IconPhone, IconPhoneX } from '@tabler/icons-react'
import { useCall } from '../../calling/CallProvider'
import { missedCalls, useCallHistory, valueAtStake } from '../../calling/history'
import Button from '../../components/ui/Button'
import Pill from '../../components/ui/Pill'
import { formatINR, formatWhen } from '../../lib/format'
import s from './Plan.module.css'

export default function Incoming() {
  const history = useCallHistory()
  const rows = useMemo(() => missedCalls(history), [history])
  const { call, place } = useCall()
  const busy = call.phase !== 'idle'
  const open = rows.filter((r) => !r.calledBack)

  return (
    <section aria-labelledby="incoming-title">
      <div className={s.sectionHead}>
        <h2 id="incoming-title">Missed calls</h2>
        <p>Ranked by expected value. Call the highest-value leads back first.</p>
      </div>

      {rows.length === 0 ? (
        <p className={s.empty}>No missed calls. You&rsquo;re all caught up.</p>
      ) : (
        <>
          <div className={s.summary}>
            <div>
              <strong className="tnum">{open.length}</strong>
              <span>Missed</span>
            </div>
            <span className={s.divider} />
            <div>
              <strong className={`${s.money} tnum`}>{formatINR(valueAtStake(rows))}</strong>
              <span>Expected value at stake</span>
            </div>
          </div>

          <ul className={s.list}>
            {rows.map(({ call: c, lead, value, signal, calledBack }) => (
              <li key={c.id} className={s.row}>
                <div className={s.rowHead}>
                  <span className={s.typeIcon} data-dir="missed">
                    <IconPhoneX size={16} />
                  </span>
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>{c.name}</span>
                    <span className={s.rowMeta}>
                      Missed {formatWhen(c.at)} · {signal}
                    </span>
                  </span>
                  <span className={s.rowSide}>
                    {calledBack ? (
                      <Pill tone="brand">Called back</Pill>
                    ) : (
                      <span className={`${s.value} tnum`} data-known={Boolean(lead)}>
                        {lead ? `${formatINR(value)} expected` : 'New contact'}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<IconPhone size={14} />}
                      disabled={busy}
                      onClick={() => place({ name: c.name, number: c.number, leadId: c.leadId })}
                    >
                      Call back
                    </Button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

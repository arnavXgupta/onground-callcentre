import { IconCheck, IconClipboardCheck, IconPhone, IconX } from '@tabler/icons-react'
import { OUTCOME_TONE } from '../../calling/callLog'
import { useCall } from '../../calling/CallProvider'
import type { CallRecord } from '../../calling/history'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Pill from '../../components/ui/Pill'
import { duration, formatWhen } from '../../lib/format'
import s from './Plan.module.css'

export default function CallReview({ call: c, onClose }: { call: CallRecord; onClose: () => void }) {
  const { call: live, place } = useCall()
  const passed = c.sop?.filter((i) => i.pass).length ?? 0
  const pct = c.sop?.length ? Math.round((100 * passed) / c.sop.length) : 0
  const tone = pct >= 80 ? 'brand' : pct >= 50 ? 'warn' : 'danger'

  return (
    <Modal
      title={`Call with ${c.name}`}
      subtitle={`${formatWhen(c.at)} · ${c.direction === 'missed' ? 'Missed' : duration(c.durationSec)}`}
      icon={<IconClipboardCheck size={18} />}
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          icon={<IconPhone size={16} />}
          disabled={live.phase !== 'idle'}
          onClick={() => {
            onClose()
            place({ name: c.name, number: c.number, leadId: c.leadId })
          }}
        >
          Call back
        </Button>
      }
    >
      {c.sop ? (
        <>
          <div className={s.adherence} data-tone={tone}>
            <div className={s.adherenceBar}>
              <div className={s.label}>SOP adherence on this call</div>
              <div className={s.bar} role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="SOP adherence">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
            <strong className="tnum">{pct}%</strong>
          </div>
          <ul className={s.sopList}>
            {c.sop.map((i) => (
              <li key={i.step} data-pass={i.pass}>
                {i.pass ? <IconCheck size={16} aria-label="Done" /> : <IconX size={16} aria-label="Missed" />}
                <div>
                  <div className={s.sopStep}>
                    {i.step}
                    {!i.pass && <Pill tone="danger">Missed</Pill>}
                  </div>
                  <p>{i.evidence}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : c.direction === 'missed' ? (
        <p className={s.reviewNote}>No conversation to review on a missed call. Call back while the lead is still warm.</p>
      ) : (
        <div className={s.wrapup}>
          {c.outcome && (
            <div>
              <div className={s.label}>Outcome</div>
              <Pill tone={OUTCOME_TONE[c.outcome]}>{c.outcome}</Pill>
            </div>
          )}
          {c.summary && (
            <div>
              <div className={s.label}>Summary</div>
              <p>{c.summary}</p>
            </div>
          )}
          <p className={s.reviewNote}>
            SOP scoring works from a call recording. Recording is off in this demo, so this call shows your wrap-up.
          </p>
        </div>
      )}
    </Modal>
  )
}

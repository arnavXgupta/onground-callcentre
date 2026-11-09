import { useId, useState } from 'react'
import { IconPhoneCheck } from '@tabler/icons-react'
import { leadById } from '../data'
import type { Lead } from '../data/types'
import { clock, formatINR } from '../lib/format'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ui from '../components/ui/ui.module.css'
import { OUTCOMES, type Outcome } from './callLog'
import { useCall } from './CallProvider'
import { callSeconds, type CallState } from './machine'
import s from './Calling.module.css'

function draftSummary(call: CallState, lead?: Lead): string {
  const who = call.contact?.name ?? 'the customer'
  if (!call.connectedAt) return `Tried ${who}, didn't connect.`
  return lead ? `Spoke with ${who} about the ${lead.product} (${formatINR(lead.price)}).` : `Spoke with ${who}.`
}

export default function WrapUp() {
  const { call, finishWrapUp } = useCall()
  const connected = Boolean(call.connectedAt)
  const lead = call.contact?.leadId ? leadById(call.contact.leadId) : undefined
  const [outcome, setOutcome] = useState<Outcome | undefined>(connected ? undefined : 'No answer')
  const [summary, setSummary] = useState(() => draftSummary(call, lead))
  const summaryId = useId()
  const outcomeId = useId()

  return (
    <Modal
      title={`Call with ${call.contact?.name ?? 'customer'}`}
      subtitle={connected ? `${clock(callSeconds(call))} · just now` : 'Not connected · just now'}
      icon={<IconPhoneCheck size={18} />}
      onClose={() => finishWrapUp()}
      footer={
        <>
          <Button onClick={() => finishWrapUp()}>Skip</Button>
          <Button variant="primary" disabled={!outcome} onClick={() => finishWrapUp({ outcome, summary })}>
            Save
          </Button>
        </>
      }
    >
      <label className={s.fieldLabel} htmlFor={summaryId}>
        Summary
      </label>
      <textarea id={summaryId} className={s.summary} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />

      <div className={s.fieldLabel} id={outcomeId}>
        Outcome
      </div>
      <div className={s.chips} role="group" aria-labelledby={outcomeId}>
        {OUTCOMES.map((o) => (
          <button key={o} type="button" className={ui.chip} aria-pressed={outcome === o} onClick={() => setOutcome(o)}>
            {o}
          </button>
        ))}
      </div>
    </Modal>
  )
}

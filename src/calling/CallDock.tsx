import { useEffect, useState } from 'react'
import { IconDialpad, IconMicrophone, IconMicrophoneOff, IconPhone, IconPhoneOff, IconX } from '@tabler/icons-react'
import { leadById } from '../data'
import { clock, formatINR } from '../lib/format'
import { useCall } from './CallProvider'
import { Keypad } from './DialPad'
import { callSeconds, type Phase } from './machine'
import WrapUp from './WrapUp'
import s from './Calling.module.css'

const LABEL: Partial<Record<Phase, string>> = {
  connecting: 'Calling…',
  ringing: 'Ringing…',
  incoming: 'Incoming call',
  in_call: 'On call',
}

function useNow(ticking: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ticking) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [ticking])
  return now
}

/** Global call UI: rendered once by the shell so a call survives navigation. */
export default function CallDock() {
  const { call, notice, dismissNotice, accept, decline, hangup, toggleMute, sendDigits } = useCall()
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const now = useNow(call.phase === 'in_call')

  useEffect(() => {
    if (call.phase !== 'in_call') {
      setKeypadOpen(false)
      setTyped('')
    }
  }, [call.phase])

  const toast = notice ? (
    <div role="alert" className={s.toast}>
      <span>{notice}</span>
      <button type="button" aria-label="Dismiss" onClick={dismissNotice}>
        <IconX size={14} />
      </button>
    </div>
  ) : null

  if (call.phase === 'idle') return toast
  if (call.phase === 'wrap_up')
    return (
      <>
        <WrapUp />
        {toast}
      </>
    )

  const { contact } = call
  const lead = contact?.leadId ? leadById(contact.leadId) : undefined
  const live = call.phase === 'in_call'

  return (
    <>
      <section className={s.dock} aria-label="Call" data-phase={call.phase}>
        <div className={s.top}>
          <span className={s.status}>
            <span className={s.pulse} />
            {LABEL[call.phase]}
          </span>
          {live && (
            <span className={`${s.timer} tnum`} aria-label="Call duration">
              {clock(callSeconds(call, now))}
            </span>
          )}
        </div>
        <div className={s.who}>{contact?.name}</div>
        <div className={`${s.meta} tnum`}>
          {contact?.number}
          {lead && ` · ${lead.productShort}`}
        </div>

        {lead && call.phase !== 'incoming' && (
          <dl className={s.context}>
            <div>
              <dt>Pitch</dt>
              <dd>
                {lead.product} · {formatINR(lead.price)}
              </dd>
            </div>
            <div>
              <dt>Cross-sell</dt>
              <dd>
                {lead.crossSell.name} · {formatINR(lead.crossSell.price)}
              </dd>
            </div>
            <div>
              <dt>EMI</dt>
              <dd>{lead.emiNote}</dd>
            </div>
          </dl>
        )}

        {keypadOpen && (
          <div className={s.dtmf}>
            <output className={`${s.typed} tnum`} aria-label="Digits sent">
              {typed || ' '}
            </output>
            <Keypad
              dark
              onKey={(k) => {
                setTyped((t) => t + k)
                sendDigits(k)
              }}
            />
          </div>
        )}

        <div className={s.controls}>
          {call.phase === 'incoming' ? (
            <>
              <button type="button" className={`${s.round} ${s.end}`} onClick={decline} aria-label="Decline">
                <IconPhoneOff size={20} />
              </button>
              <button type="button" className={`${s.round} ${s.answer}`} onClick={accept} aria-label="Accept">
                <IconPhone size={20} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className={s.round} onClick={toggleMute} disabled={!live} aria-pressed={call.muted} aria-label="Mute">
                {call.muted ? <IconMicrophoneOff size={20} /> : <IconMicrophone size={20} />}
              </button>
              <button
                type="button"
                className={s.round}
                onClick={() => setKeypadOpen((o) => !o)}
                disabled={!live}
                aria-pressed={keypadOpen}
                aria-label="Keypad"
              >
                <IconDialpad size={20} />
              </button>
              <button type="button" className={`${s.round} ${s.end}`} onClick={hangup} aria-label="End call">
                <IconPhoneOff size={20} />
              </button>
            </>
          )}
        </div>
      </section>
      {toast}
    </>
  )
}

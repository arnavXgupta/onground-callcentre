import { useState } from 'react'
import { IconChevronDown, IconPin } from '@tabler/icons-react'
import type { PulseAsk } from '../../data/types'
import { pulseStore } from '../../pulse/store'
import s from './Pulse.module.css'

function AskCard({ channelId, ask }: { channelId: string; ask: PulseAsk }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  return (
    <div className={s.ask} role="group" aria-label={ask.question}>
      <div className={s.askQ}>{ask.question}</div>
      <div className={s.askCtx}>{ask.context}</div>
      <div className={s.askOptions}>
        {ask.options.map((o) => (
          <button key={o} type="button" onClick={() => pulseStore.answer(channelId, ask.id, o)}>
            {o}
          </button>
        ))}
      </div>
      <form
        className={s.askReply}
        onSubmit={(e) => {
          e.preventDefault()
          if (!pulseStore.answer(channelId, ask.id, text)) setError('Type an answer first')
        }}
      >
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError('')
          }}
          placeholder="Or type your answer"
          aria-label={`Your answer: ${ask.question}`}
        />
        <button type="submit">Send</button>
      </form>
      {error && <p className={s.askError}>{error}</p>}
    </div>
  )
}

/** Pinned between the header and the thread, so it never scrolls away. */
export default function NeedsInput({ channelId, asks }: { channelId: string; asks: PulseAsk[] }) {
  const [open, setOpen] = useState(true)

  return (
    <section className={s.pinned} aria-label="Needs your input">
      <button type="button" className={s.pinHead} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconPin size={16} />
        Needs your input
        <span className={s.count}>{asks.length}</span>
        <span className={s.pinNote}>pinned</span>
        <IconChevronDown size={16} className={s.chevron} />
      </button>
      {open ? (
        asks.map((a) => <AskCard key={a.id} channelId={channelId} ask={a} />)
      ) : (
        <p className={s.pinCollapsed}>
          {asks[0].question}
          {asks.length > 1 && ` +${asks.length - 1} more`}
        </p>
      )}
    </section>
  )
}

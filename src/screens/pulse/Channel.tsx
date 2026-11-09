import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { IconArrowLeft, IconCheck, IconSend } from '@tabler/icons-react'
import Avatar from '../../components/ui/Avatar'
import Pill from '../../components/ui/Pill'
import { agentById, channelById } from '../../data'
import type { PulseCard, PulseMessage } from '../../data/types'
import { openAsks, pulseStore, threadFor, usePulse } from '../../pulse/store'
import AgentCard from './AgentCard'
import NeedsInput from './NeedsInput'
import s from './Pulse.module.css'

/** Highlight "@You…" mentions inside message text. */
function withMentions(text: string) {
  return text.split(/(@You(?: \(Arvind R\.\))?)/).map((part, i) =>
    part.startsWith('@You') ? (
      <mark key={i} className={s.at}>
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

function BotCard({ card }: { card: PulseCard }) {
  // "?leads=…" opens the Leads modal over this channel; anything else is a route.
  const to = card.action?.to.startsWith('?') ? { search: card.action.to } : card.action?.to
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <strong>{card.title}</strong>
        {card.badge && <Pill tone="brand">{card.badge}</Pill>}
      </div>
      <dl>
        {card.fields.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {card.action && to && (
        <Link to={to} className={s.cardAction}>
          {card.action.label}
        </Link>
      )}
    </div>
  )
}

function Bubble({ m }: { m: PulseMessage }) {
  return (
    <div className={s.msg} data-mine={m.mine || undefined}>
      {!m.mine && <Avatar name={m.from} initials={m.initials} size={32} />}
      <div className={s.msgBody}>
        <div className={s.msgMeta}>
          <strong>{m.from}</strong>
          {m.bot && <span className={s.botTag}>Bot</span>}
          {m.via && <span className={s.via}>via {m.via}</span>}
          <time>{m.time}</time>
        </div>
        {m.text && (
          <div className={s.bubble}>
            {m.label && <b>{m.label}: </b>}
            {withMentions(m.text)}
          </div>
        )}
        {m.card && <BotCard card={m.card} />}
        {m.done && (
          <div className={s.done}>
            <IconCheck size={14} /> Task done · removed from your tasks
          </div>
        )}
      </div>
    </div>
  )
}

export default function Channel() {
  const { channel: id = '' } = useParams()
  const location = useLocation()
  const state = usePulse()
  const [draft, setDraft] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)

  const channel = channelById(id)
  const agent = agentById(id)
  const thread = channel ? threadFor(channel, state) : (state.sent[id] ?? [])

  useEffect(() => {
    if (channel || agent) pulseStore.markRead(id)
  }, [id, channel, agent])

  useEffect(() => {
    if ((location.state as { focus?: boolean } | null)?.focus) composer.current?.focus()
  }, [location.state])

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [thread.length, state.botTyping])

  if (!channel && !agent) return <Navigate to="/pulse" replace />

  const title = channel?.title ?? agent!.title
  const subtitle = channel?.subtitle ?? agent!.name
  const asks = channel ? openAsks(channel, state) : []

  function submit() {
    if (pulseStore.send(id, draft)) setDraft('')
  }

  return (
    <div className={s.chat}>
      <div className={s.chatHead}>
        <Link to="/pulse" className={s.back} aria-label="Back to Pulse">
          <IconArrowLeft size={18} />
        </Link>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {asks.length > 0 && <NeedsInput channelId={id} asks={asks} />}

      <div className={s.thread} role="log" aria-label={`${title} messages`}>
        <div className={s.divider}>
          <span>Today · {subtitle}</span>
        </div>
        {agent && <AgentCard agent={agent} />}
        {thread.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {id === 'avanibot' && state.botTyping && <div className={s.typing}>AvaniBot is typing…</div>}
        <div ref={end} />
      </div>

      <form
        className={s.composer}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <textarea
          ref={composer}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={`Message ${title}…`}
          aria-label={`Message ${title}`}
        />
        <button type="submit" className={s.send} disabled={!draft.trim()} aria-label="Send message">
          <IconSend size={16} />
        </button>
      </form>
    </div>
  )
}

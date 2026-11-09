import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  IconAt,
  IconBrandWhatsapp,
  IconChevronDown,
  IconHash,
  IconHeadset,
  IconListCheck,
  IconMessageCircle,
  IconMicrophone,
  IconShoppingCartPlus,
  IconSparkles,
  IconTargetArrow,
  IconTrophy,
  type Icon,
} from '@tabler/icons-react'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import { pulse } from '../../data'
import { lowerFirst } from '../../lib/format'
import type { PulseAgent, PulseChannel } from '../../data/types'
import { badgeFor, pulseStore, usePulse, type PulseState } from '../../pulse/store'
import s from './Pulse.module.css'

const AGENT_ICON: Record<string, Icon> = {
  'callcentre-agent': IconHeadset,
  'cross-sell-agent': IconShoppingCartPlus,
  'sop-agent': IconListCheck,
  'lead-conversion-agent': IconTargetArrow,
  'capture-agent': IconMicrophone,
}

const searchable = (c: PulseChannel) => [c.title, c.subtitle, c.preview, ...c.messages.map((m) => m.text ?? '')].join(' ').toLowerCase()

function ChannelRow({ c, state }: { c: PulseChannel; state: PulseState }) {
  const badge = badgeFor(c, state)
  return (
    <li>
      <Link to={`/pulse/${c.id}`} className={s.row}>
        {c.kind === 'dm' ? (
          <Avatar name={c.title} />
        ) : (
          <span className={s.rowIcon} data-kind={c.kind}>
            {c.kind === 'customer' ? <IconBrandWhatsapp size={16} /> : <IconHash size={16} />}
          </span>
        )}
        <span className={s.rowMain}>
          <span className={s.rowTitle}>
            {c.kind === 'channel' ? c.title.slice(1) : c.title}
            {c.badge && <span className={s.tag}>{c.badge}</span>}
          </span>
          <span className={s.rowMeta}>{c.preview}</span>
        </span>
        <span className={s.rowSide}>
          <span className={s.time}>{c.time}</span>
          <span className={s.badges}>
            {c.mention && !state.read.includes(c.id) && (
              <span className={s.mention} aria-label="Mentions you">
                <IconAt size={12} />
              </span>
            )}
            {badge > 0 && (
              <span className={s.count} aria-label={`${badge} new`}>
                {badge}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

function AgentRow({ a }: { a: PulseAgent }) {
  const AgentIcon = AGENT_ICON[a.id] ?? IconSparkles
  const up = a.delta >= 0
  return (
    <li>
      <Link to={`/pulse/${a.id}`} className={s.row}>
        <span className={s.rowIcon} data-kind={a.type}>
          <AgentIcon size={16} />
        </span>
        <span className={s.rowMain}>
          <span className={s.rowTitle}>{a.title}</span>
          <span className={s.rowMeta}>{a.type === 'role' ? a.name : `Your ${lowerFirst(a.metric)} · ${a.members} members`}</span>
        </span>
        <span className={s.rowSide}>
          <span className={`${s.metric} tnum`} data-on-target={a.value >= a.target}>
            {a.value}% <small>{up ? '▲' : '▼'}{Math.abs(a.delta)}</small>
          </span>
          <span className={s.count} aria-label={`${a.items.length} to act on`}>
            {a.items.length}
          </span>
        </span>
      </Link>
    </li>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={s.section} aria-label={title}>
      <h2 className={s.sectionTitle}>
        {title} {hint && <span>{hint}</span>}
      </h2>
      <ul className={s.list}>{children}</ul>
    </section>
  )
}

export default function PulseHome() {
  const state = usePulse()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [kudosOpen, setKudosOpen] = useState(false)

  const q = query.trim().toLowerCase()
  const of = (kind: PulseChannel['kind']) => pulse.channels.filter((c) => c.kind === kind && (!q || searchable(c).includes(q)))
  const channels = of('channel')
  const dms = of('dm')
  const general = of('customer')
  const agents = pulse.agents.filter((a) => !q || `${a.title} ${a.name} ${a.metric}`.toLowerCase().includes(q))
  const roleAgents = agents.filter((a) => a.type === 'role')
  const taskAgents = agents.filter((a) => a.type === 'task')
  const nothing = !channels.length && !dms.length && !general.length && !agents.length
  const latest = pulse.kudos.items[0]

  function askBot(text: string) {
    pulseStore.send('avanibot', text)
    navigate('/pulse/avanibot')
  }

  return (
    <div className={s.page}>
      <PageHeader eyebrow={pulse.workspace} title="Pulse" />

      <form
        role="search"
        className={s.search}
        onSubmit={(e) => {
          e.preventDefault()
          if (q) askBot(query)
        }}
      >
        <IconSparkles size={16} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AvaniBot or search Pulse…"
          aria-label="Ask AvaniBot or search Pulse"
        />
      </form>

      {!q && (
        <section className={s.bot} aria-label="AvaniBot">
          <div className={s.botHead}>
            <span className={s.botIcon}>
              <IconSparkles size={18} />
            </span>
            <div>
              <div className={s.botName}>
                AvaniBot <span>Always on</span>
              </div>
              <p>Ask me about anything happening in Pulse: daily briefs, action items, quick answers.</p>
            </div>
          </div>
          <div className={s.botActions}>
            <button type="button" onClick={() => askBot('Give me my daily brief')}>
              <IconSparkles size={14} /> Daily Brief
            </button>
            <button type="button" onClick={() => navigate('/pulse/avanibot', { state: { focus: true } })}>
              <IconMessageCircle size={14} /> Ask a question
            </button>
          </div>
        </section>
      )}

      {nothing && <p className={s.empty}>Nothing matches “{query.trim()}”. Press Enter to ask AvaniBot.</p>}

      {agents.length > 0 && (
        <details className={s.agents} open>
          <summary>
            <span className={s.agentsIcon}>
              <IconSparkles size={16} />
            </span>
            <span className={s.rowMain}>
              <span className={s.rowTitle}>Custom agents</span>
              <span className={s.rowMeta}>Set up by your manager, already live. Open one to see where you stand.</span>
            </span>
            <IconChevronDown size={16} className={s.chevron} />
          </summary>
          {roleAgents.length > 0 && (
            <Section title="Role agents" hint="run a team">
              {roleAgents.map((a) => (
                <AgentRow key={a.id} a={a} />
              ))}
            </Section>
          )}
          {taskAgents.length > 0 && (
            <Section title="Task agents" hint="move one metric">
              {taskAgents.map((a) => (
                <AgentRow key={a.id} a={a} />
              ))}
            </Section>
          )}
        </details>
      )}

      {general.length > 0 && (
        <Section title="General">
          {general.map((c) => (
            <ChannelRow key={c.id} c={c} state={state} />
          ))}
        </Section>
      )}

      {!q && (
        <button type="button" className={s.kudos} onClick={() => setKudosOpen(true)}>
          <span className={s.kudosIcon}>
            <IconTrophy size={18} />
          </span>
          <span className={s.rowMain}>
            <span className={s.rowTitle}>
              Kudos <span className={s.newTag}>{pulse.kudos.items.length} new</span>
            </span>
            <span className={s.rowMeta}>
              “{latest.text}” · {latest.from}
            </span>
          </span>
          <span className={s.allTime}>
            <strong className="tnum">{pulse.kudos.allTime}</strong>
            All-time
          </span>
        </button>
      )}

      {channels.length > 0 && (
        <Section title="Channels">
          {channels.map((c) => (
            <ChannelRow key={c.id} c={c} state={state} />
          ))}
        </Section>
      )}

      {dms.length > 0 && (
        <Section title="Direct messages">
          {dms.map((c) => (
            <ChannelRow key={c.id} c={c} state={state} />
          ))}
        </Section>
      )}

      {kudosOpen && (
        <Modal title="Kudos" subtitle="Team recognition, sent by your leaders" icon={<IconTrophy size={18} />} onClose={() => setKudosOpen(false)}>
          <ul className={s.kudosList}>
            {pulse.kudos.items.map((k) => (
              <li key={k.from + k.time}>
                <div className={s.kudosFrom}>
                  <Avatar name={k.from} initials={k.initials} size={32} />
                  <div>
                    <strong>{k.from}</strong>
                    <span>
                      {k.role} · {k.time}
                    </span>
                  </div>
                  <span aria-hidden="true">{k.emoji}</span>
                </div>
                <p>“{k.text}”</p>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}

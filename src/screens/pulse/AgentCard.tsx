import type { PulseAgent } from '../../data/types'
import { lowerFirst } from '../../lib/format'
import s from './Pulse.module.css'

/** What an AI agent channel opens with: the agent's read on you for its one metric. */
export default function AgentCard({ agent: a }: { agent: PulseAgent }) {
  const onTarget = a.value >= a.target
  return (
    <article className={s.agentCard} aria-label={`${a.name}: your read`}>
      <div className={s.agentHead}>
        <span className={s.botTag}>Agent</span>
        <strong>{a.name}</strong>
      </div>

      <div className={s.agentMetric} data-on-target={onTarget}>
        <div>
          <div className={s.label}>Your {lowerFirst(a.metric)}</div>
          <strong className="tnum">{a.value}%</strong>
        </div>
        <span className="tnum">
          target {a.target}% · {a.delta >= 0 ? '▲' : '▼'}
          {Math.abs(a.delta)} this week
        </span>
      </div>
      <div
        className={s.meter}
        role="meter"
        aria-label={a.metric}
        aria-valuenow={a.value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${a.value}%` }} />
        <i style={{ left: `${a.target}%` }} title={`Target ${a.target}%`} />
      </div>

      <dl className={s.agentNotes}>
        <div>
          <dt>Going well</dt>
          <dd>{a.wentWell}</dd>
        </div>
        <div>
          <dt>To improve</dt>
          <dd>{a.improve}</dd>
        </div>
      </dl>

      <div className={s.label}>{a.itemsLabel}</div>
      <ul className={s.agentItems}>
        {a.items.map(([who, what]) => (
          <li key={who}>
            <strong>{who}</strong>
            <span>{what}</span>
          </li>
        ))}
      </ul>

      <div className={s.chipsRow}>
        {a.strengths.map((t) => (
          <span key={t} className={s.strength}>
            {t}
          </span>
        ))}
        {a.workOn.map((t) => (
          <span key={t} className={s.workOn}>
            {t}
          </span>
        ))}
      </div>
    </article>
  )
}

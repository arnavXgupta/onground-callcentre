import { useState } from 'react'
import { IconBulb, IconPlayerPlay, IconPlayerStop, IconRefresh } from '@tabler/icons-react'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import { leadById } from '../../data'
import practise from '../../data/practise.json'
import type { Lead } from '../../data/types'
import { clock, duration } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import s from './Plan.module.css'

type Scenario = (typeof practise.scenarios)[number]

type Phase =
  | { kind: 'pick' }
  | { kind: 'live'; scenario: Scenario; startedAt: number; line: number; ticked: boolean[] }
  | { kind: 'feedback'; scenario: Scenario; seconds: number; ticked: boolean[] }

const fill = (text: string, lead: Lead) => text.replace('{name}', lead.name.split(' ')[0]).replace('{product}', lead.product)
const untickedAll = () => practise.steps.map(() => false)

/** A rehearsal against a scripted customer. Deliberately outside the real call path: nothing is dialled or logged. */
export default function Practise() {
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const now = useNow(phase.kind === 'live')

  const start = (scenario: Scenario) => setPhase({ kind: 'live', scenario, startedAt: Date.now(), line: 0, ticked: untickedAll() })

  if (phase.kind === 'pick') {
    return (
      <section aria-labelledby="practise-title">
        <div className={s.sectionHead}>
          <h2 id="practise-title">Practise a call</h2>
          <p>Rehearse with a scripted customer before the real thing. Nothing here is dialled or logged.</p>
        </div>
        <ul className={s.scenarios}>
          {practise.scenarios.map((sc) => {
            const lead = leadById(sc.leadId)!
            return (
              <li key={sc.id} className={s.scenario}>
                <div className={s.scenarioHead}>
                  <Avatar name={lead.name} initials={lead.initials} />
                  <div>
                    <strong>{lead.name}</strong>
                    <span>{sc.title}</span>
                  </div>
                </div>
                <p>{sc.brief}</p>
                <Button variant="primary" icon={<IconPlayerPlay size={16} />} onClick={() => start(sc)} aria-label={`Practise with ${lead.name}`}>
                  Start practice
                </Button>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const lead = leadById(phase.scenario.leadId)!

  if (phase.kind === 'live') {
    const { scenario, line, ticked } = phase
    const last = scenario.lines.length - 1
    const next = practise.steps.findIndex((_, i) => !ticked[i])
    const toggle = (i: number) => setPhase({ ...phase, ticked: ticked.map((t, j) => (j === i ? !t : t)) })

    return (
      <section className={s.practice} aria-label="Practice call">
        <div className={s.practiceHead}>
          <div>
            <div className={s.label}>Practice call</div>
            <strong>
              {lead.name} · {scenario.title}
            </strong>
          </div>
          <span className={`${s.practiceTimer} tnum`} aria-label="Practice time">
            {clock(Math.floor((now - phase.startedAt) / 1000))}
          </span>
          <Button
            variant="danger"
            size="sm"
            icon={<IconPlayerStop size={14} />}
            onClick={() => setPhase({ kind: 'feedback', scenario, seconds: Math.floor((Date.now() - phase.startedAt) / 1000), ticked })}
          >
            End practice
          </Button>
        </div>

        <div className={s.practiceBody}>
          <div>
            <div className={s.customer}>
              <Avatar name={lead.name} initials={lead.initials} size={32} />
              <div>
                <div className={s.label}>
                  {lead.name} · line {line + 1} of {scenario.lines.length}
                </div>
                <p className={s.customerLine} aria-live="polite">
                  {scenario.lines[line]}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setPhase({ ...phase, line: line + 1 })} disabled={line === last}>
              {line === last ? 'End of script' : 'Next line'}
            </Button>

            <div className={s.hint} role="note">
              <IconBulb size={16} />
              {next === -1 ? (
                <span>Every step covered. Close the call.</span>
              ) : (
                <span>
                  <b>{practise.steps[next].step}:</b> {fill(practise.steps[next].hint, lead)}
                </span>
              )}
            </div>
          </div>

          <fieldset className={s.checklist}>
            <legend className={s.label}>SOP steps covered</legend>
            {practise.steps.map((st, i) => (
              <label key={st.step}>
                <input type="checkbox" checked={ticked[i]} onChange={() => toggle(i)} />
                {st.step}
              </label>
            ))}
          </fieldset>
        </div>
      </section>
    )
  }

  // feedback
  const covered = phase.ticked.filter(Boolean).length
  const pct = Math.round((100 * covered) / practise.steps.length)
  const tone = pct >= 80 ? 'brand' : pct >= 50 ? 'warn' : 'danger'
  const missed = practise.steps.filter((_, i) => !phase.ticked[i])

  return (
    <section className={s.practice} aria-label="Practice feedback">
      <div className={s.adherence} data-tone={tone}>
        <div className={s.adherenceBar}>
          <div className={s.label}>
            {lead.name} · {phase.scenario.title}
          </div>
          <div className={s.bar} role="meter" aria-label="Steps covered" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className={s.feedbackMeta}>
            {covered} of {practise.steps.length} steps · {duration(phase.seconds)}
          </div>
        </div>
        <strong className="tnum">{pct}%</strong>
      </div>

      {missed.length === 0 ? (
        <p className={s.reviewNote}>Every SOP step covered. That&rsquo;s the call to repeat for real.</p>
      ) : (
        <ul className={s.sopList}>
          {missed.map((m) => (
            <li key={m.step} data-pass="false">
              <IconBulb size={16} />
              <div>
                <div className={s.sopStep}>{m.step}</div>
                <p>{m.tip}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={s.practiceActions}>
        <Button variant="primary" icon={<IconRefresh size={16} />} onClick={() => start(phase.scenario)}>
          Practise again
        </Button>
        <Button onClick={() => setPhase({ kind: 'pick' })}>Pick another</Button>
      </div>
    </section>
  )
}

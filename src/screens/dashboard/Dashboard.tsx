import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { IconChevronRight, IconHeadset, IconNotes, IconPhoneCall, IconUsers, IconWallet, type Icon } from '@tabler/icons-react'
import { useCallLog } from '../../calling/callLog'
import { useCall } from '../../calling/CallProvider'
import { agent } from '../../data'
import data from '../../data/dashboard.json'
import { duration, formatINR } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { usePulse } from '../../pulse/store'
import s from './Dashboard.module.css'

// Recharts is the heaviest dependency: load it after the first paint.
const WeekChart = lazy(() => import('./WeekChart'))

type PeriodKey = keyof typeof data.periods
const PERIODS = Object.keys(data.periods) as PeriodKey[]

const TASK_ICON: Record<string, Icon> = { callback: IconPhoneCall, leads: IconUsers, outcome: IconNotes }

export const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

/** The last six weekdays then "Today", oldest first. */
export function last7Labels(now = new Date()): string[] {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
  return Array.from({ length: 7 }, (_, i) =>
    i === 6 ? 'Today' : day.format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))),
  )
}

function Delta({ value, unit = '%', goodWhenDown = false }: { value: number; unit?: string; goodWhenDown?: boolean }) {
  const good = goodWhenDown ? value <= 0 : value >= 0
  return (
    <span className={s.delta} data-good={good}>
      {value >= 0 ? '▲' : '▼'}
      {Math.abs(value)}
      {unit}
    </span>
  )
}

function QueueStatus() {
  const { status, goOnline } = useCall()
  if (status === 'online')
    return (
      <span className={s.onQueue}>
        <span /> On queue
      </span>
    )
  const label = status === 'connecting' ? 'Connecting…' : status === 'mic_blocked' ? 'Mic blocked · retry' : 'Off queue · Go online'
  return (
    <button type="button" className={s.offQueue} onClick={goOnline} disabled={status === 'connecting'}>
      {label}
    </button>
  )
}

const waitTone = (sec: number) => (sec >= 240 ? 'danger' : sec >= 90 ? 'warn' : 'brand')

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>('today')
  const [openedAt] = useState(() => Date.now())
  const now = useNow()
  const log = useCallLog()
  const pulse = usePulse()

  const p = data.periods[period]
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  // Lead calls the agent placed in this app today count towards "Leads called".
  const liveLeadCalls = log.filter((c) => c.leadId && c.direction === 'outgoing' && c.at >= startOfToday).length
  const tasks = data.tasks.filter((t) => !(t.askId in pulse.answered))
  const labels = useMemo(() => last7Labels(), [])
  const { amount, coached, slabMin, slabMax } = data.earnings
  const slabPct = Math.round(((amount - slabMin) / (slabMax - slabMin)) * 100)

  return (
    <div className={s.page}>
      <section className={s.hero} aria-label="Today at a glance">
        <div className={s.heroTop}>
          <div>
            <p className={s.greet}>{greeting(new Date().getHours())}</p>
            <h1 className={s.name}>{agent.name}</h1>
            <p className={s.brandLine}>{agent.company} · Call Centre</p>
          </div>
          <div className={s.heroActions}>
            <QueueStatus />
            <select className={s.period} value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)} aria-label="Period">
              {PERIODS.map((k) => (
                <option key={k} value={k}>
                  {data.periods[k].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ul className={s.kpis}>
          <li>
            <strong className="tnum">{data.ogScore.value}</strong>
            <span>OG Score™</span>
            <Delta value={data.ogScore.delta} unit="" />
          </li>
          <li>
            <strong className="tnum">{p.aht}</strong>
            <span>Avg handle time</span>
            <Delta value={p.ahtDelta} goodWhenDown />
          </li>
          <li>
            <strong className="tnum">{p.csat}%</strong>
            <span>CSAT {p.label.toLowerCase()}</span>
            <Delta value={p.csatDelta} unit="pt" />
          </li>
          <li>
            <strong className="tnum">{data.queue.length}</strong>
            <span>In queue</span>
            <span className={s.live}>● live</span>
          </li>
        </ul>
      </section>

      <div className={s.grid}>
        <div className={s.col}>
          <section className={s.card} aria-labelledby="progress-title">
            <h2 id="progress-title" className={s.eyebrow}>
              My progress · {p.label.toLowerCase()}
            </h2>
            <div className={s.stats}>
              <div>
                <strong className="tnum">{p.created}</strong>
                <span>Leads created</span>
                <Delta value={p.createdDelta} unit="" />
              </div>
              <div>
                <strong className="tnum">{p.called + liveLeadCalls}</strong>
                <span>Leads called</span>
                <Delta value={p.calledDelta + liveLeadCalls} unit="" />
              </div>
            </div>
          </section>

          <section className={s.card} aria-labelledby="waiting-title">
            <div className={s.cardHead}>
              <h2 id="waiting-title" className={s.eyebrow}>
                Who&rsquo;s waiting
              </h2>
              <Link to="/plan/outgoing" className={s.link}>
                Open planner →
              </Link>
            </div>
            {data.queue.length === 0 ? (
              <p className={s.empty}>Queue is empty right now</p>
            ) : (
              <ul className={s.list}>
                {data.queue.map((q) => {
                  const waited = q.waitingSec + Math.floor((now - openedAt) / 1000)
                  return (
                    <li key={q.name} className={s.item}>
                      <span className={s.itemIcon}>
                        <IconHeadset size={16} />
                      </span>
                      <span className={s.itemMain}>
                        <strong>{q.name}</strong>
                        <span>{q.reason}</span>
                      </span>
                      <span className={`${s.wait} tnum`} data-tone={waitTone(waited)} aria-label={`Waiting ${duration(waited)}`}>
                        {duration(waited)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className={s.col}>
          <section className={s.card} aria-labelledby="earnings-title">
            <div className={s.cardHead}>
              <h2 id="earnings-title" className={s.eyebrow}>
                <IconWallet size={14} /> My earnings this month
              </h2>
              <span className={s.muted}>
                {formatINR(slabMin)} to {formatINR(slabMax)} slab
              </span>
            </div>
            <p className={s.money}>
              <strong className="tnum">{formatINR(amount)}</strong>
              <span>{formatINR(coached)} from coached moves</span>
            </p>
            <div className={s.slab} role="meter" aria-label="Earnings slab" aria-valuenow={slabPct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${slabPct}%` }} />
            </div>
          </section>

          <section className={s.card} aria-labelledby="tasks-title">
            <div className={s.cardHead}>
              <h2 id="tasks-title" className={s.eyebrow}>
                My tasks
              </h2>
              {tasks.length > 0 && (
                <span className={s.badge} aria-label={`${tasks.length} open`}>
                  {tasks.length}
                </span>
              )}
            </div>
            {tasks.length === 0 ? (
              <p className={s.empty}>All caught up. Nothing needs you right now.</p>
            ) : (
              <ul className={s.list}>
                {tasks.map((t) => {
                  const TaskIcon = TASK_ICON[t.kind] ?? IconNotes
                  return (
                    <li key={t.askId}>
                      <Link to={t.to.startsWith('?') ? { search: t.to } : t.to} className={`${s.item} ${s.task}`}>
                        <span className={s.itemIcon} data-kind={t.kind}>
                          <TaskIcon size={16} />
                        </span>
                        <span className={s.itemMain}>
                          <strong>
                            {t.title} <span>{t.detail}</span>
                          </strong>
                        </span>
                        <IconChevronRight size={16} className={s.chev} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className={s.charts}>
        <Suspense fallback={<div className={s.chartSkeleton} />}>
          <WeekChart title="Calls handled · last 7 days" labels={labels} values={data.callsHandled} color="#c7d2f5" strong="#3b5bdb" />
          <WeekChart title="CSAT trend · last 7 days" labels={labels} values={data.csat} unit="%" color="#0e7c9a" strong="#0e7c9a" line />
        </Suspense>
      </div>
    </div>
  )
}

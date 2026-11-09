import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconMail, IconUsers } from '@tabler/icons-react'
import PageHeader from '../../components/ui/PageHeader'
import { timeOfDay } from '../../lib/format'
import { datedEvents, monthGrid, sameDay, shiftMonth } from './month'
import s from './Calendar.module.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const dayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Calendar() {
  const today = useMemo(() => new Date(), [])
  const events = useMemo(() => datedEvents(today), [today])
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<Date | null>(null)

  const cells = monthGrid(view.year, view.month)
  const inMonth = events.filter((e) => e.at.getFullYear() === view.year && e.at.getMonth() === view.month)
  const listed = selected ? inMonth.filter((e) => sameDay(e.at, selected)) : inMonth

  function go(delta: number) {
    setView((v) => shiftMonth(v, delta))
    setSelected(null)
  }

  return (
    <div className={s.page}>
      <PageHeader eyebrow="Mirrored from your mailbox" title="Calendar" />

      <p className={s.banner}>
        <IconMail size={16} />
        Store visits, coaching sessions and meeting invites show up here, and in your mailbox.
      </p>

      <section className={s.card} aria-label="Month">
        <div className={s.toolbar}>
          <button type="button" className={s.navBtn} onClick={() => go(-1)} aria-label="Previous month">
            <IconChevronLeft size={16} />
          </button>
          <h2 className={s.month} aria-live="polite">
            {monthLabel.format(new Date(view.year, view.month, 1))}
          </h2>
          <button
            type="button"
            className={s.todayBtn}
            onClick={() => {
              setView({ year: today.getFullYear(), month: today.getMonth() })
              setSelected(today)
            }}
          >
            Today
          </button>
          <button type="button" className={s.navBtn} onClick={() => go(1)} aria-label="Next month">
            <IconChevronRight size={16} />
          </button>
        </div>

        <div className={s.grid}>
          {WEEKDAYS.map((d, i) => (
            <span key={i} className={s.weekday} aria-hidden="true">
              {d}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />
            const count = events.filter((e) => sameDay(e.at, date)).length
            const isToday = sameDay(date, today)
            const isSelected = selected !== null && sameDay(date, selected)
            const label = [dayLabel.format(date), isToday && 'today', count && `${count} event${count > 1 ? 's' : ''}`]
              .filter(Boolean)
              .join(', ')
            return (
              <button
                key={date.getDate()}
                type="button"
                className={s.day}
                data-today={isToday || undefined}
                aria-pressed={isSelected}
                aria-label={label}
                onClick={() => setSelected(isSelected ? null : date)}
              >
                <span className="tnum">{date.getDate()}</span>
                {count > 0 && <span className={s.dot} />}
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="events-title">
        <h2 id="events-title" className={s.eyebrow}>
          {selected ? shortDay.format(selected) : 'Upcoming'}
        </h2>
        {listed.length === 0 ? (
          <p className={s.empty}>{selected ? `Nothing on ${shortDay.format(selected)}.` : 'Nothing scheduled this month.'}</p>
        ) : (
          <ul className={s.events}>
            {listed.map((e) => (
              <li key={e.id} className={s.event}>
                <div className={s.when}>
                  <strong className="tnum">{timeOfDay(e.at.getTime())}</strong>
                  <span>{shortDay.format(e.at)}</span>
                </div>
                <div className={s.what}>
                  <strong>{e.title}</strong>
                  <span>
                    <IconUsers size={14} /> {e.with}
                    {e.via && ` · ${e.via}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

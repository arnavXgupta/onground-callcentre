import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import {
  IconBuildingStore,
  IconChevronLeft,
  IconChevronRight,
  IconCurrencyRupee,
  IconFileInvoice,
  IconFlame,
  IconPackage,
  IconPhone,
  IconReceipt,
  IconShieldCheck,
  IconTag,
  IconTarget,
  IconUsers,
  type Icon,
} from '@tabler/icons-react'
import { useCall } from '../../calling/CallProvider'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Pill from '../../components/ui/Pill'
import { leads } from '../../data'
import { formatINR, scoreTone } from '../../lib/format'
import s from './Leads.module.css'

const SIGNAL_ICON: Record<string, Icon> = {
  'Quotation demanded': IconFileInvoice,
  'Product fit': IconPackage,
  Financing: IconCurrencyRupee,
  Warranty: IconShieldCheck,
  'In-store experience': IconBuildingStore,
}

const STATUS_LABEL = { open: 'Open', ageing: 'Ageing', cold: 'Cold' }

/** Opened by `?leads` (lead 1) or `?leads=<leadId>`. Shell renders it when the param is present. */
export default function LeadsModal() {
  const [params, setParams] = useSearchParams()
  const [index, setIndex] = useState(() => Math.max(0, leads.findIndex((l) => l.id === params.get('leads'))))
  const [quotes, setQuotes] = useState<Record<string, boolean>>({})
  const { call, place } = useCall()

  const lead = leads[index]
  const last = leads.length - 1
  const busy = call.phase !== 'idle'
  const quoteOn = quotes[lead.id] ?? lead.quoteRequested
  const go = (i: number) => setIndex(Math.min(last, Math.max(0, i)))

  // ← / → page between leads. On window, not the dialog: clicking an arrow that then becomes
  // disabled (first/last lead) drops focus to <body>, and the keys must keep working.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(last, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])
  const close = () =>
    setParams(
      (p) => {
        p.delete('leads')
        return p
      },
      { replace: true },
    )

  return (
    <Modal
      tone="ai"
      title="Leads"
      subtitle={`Lead ${index + 1} of ${leads.length} · SLA to close`}
      icon={<IconUsers size={18} />}
      onClose={close}
      toolbar={
        <div className={s.pager}>
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous lead">
            <IconChevronLeft size={16} />
          </button>
          <div className={s.dots}>
            {leads.map((l, i) => (
              <button
                key={l.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to lead ${i + 1}: ${l.name}`}
                aria-current={i === index ? 'step' : undefined}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(index + 1)} disabled={index === last} aria-label="Next lead">
            <IconChevronRight size={16} />
          </button>
        </div>
      }
      footer={
        <div className={s.footer}>
          <Button
            variant="primary"
            block
            icon={<IconPhone size={16} />}
            disabled={busy}
            onClick={() => {
              close()
              place({ name: lead.name, number: lead.phone, leadId: lead.id })
            }}
          >
            {busy ? 'On a call' : `Call ${lead.name}`}
          </Button>
          <p className={s.missed}>
            <span className={s.redDot} />
            Cumulative missed: 2 · expired without close, visible to manager
          </p>
        </div>
      }
    >
      {/* keyed by lead: each lead starts with the default open/closed folds */}
      <div key={lead.id} className={s.page}>
        <div className={s.status} data-status={lead.status}>
          <span />
          {STATUS_LABEL[lead.status]}
        </div>

        <div className={s.leadCard}>
          <Avatar name={lead.name} initials={lead.initials} size={40} />
          <div className={s.leadMain}>
            <strong>{lead.name}</strong>
            <span>
              {lead.intent === 'browsing' ? 'Browsing' : 'Interested'}: {lead.productShort} · {formatINR(lead.price)}
            </span>
          </div>
          <Pill tone={lead.sla.tone}>{lead.sla.label}</Pill>
        </div>

        <div className={s.quote}>
          <span>
            <IconReceipt size={16} />
            Quote to be given to customer
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={quoteOn}
            aria-label="Quote to be given to customer"
            className={s.switch}
            onClick={() => setQuotes((q) => ({ ...q, [lead.id]: !quoteOn }))}
          >
            <span />
          </button>
        </div>

        {lead.slaNote && <p className={s.slaNote}>{lead.slaNote}</p>}

        <div className={s.icp}>
          <span className={s.metricLabel}>
            <IconTarget size={16} />
            ICP
          </span>
          <div className={s.track} role="meter" aria-label="ICP" aria-valuenow={lead.icp} aria-valuemin={0} aria-valuemax={100}>
            <span data-tone={scoreTone(lead.icp)} style={{ '--pct': `${lead.icp}%` } as CSSProperties} />
          </div>
          <strong className="tnum">{lead.icp}%</strong>
        </div>

        <div className={s.intent}>
          <span className={s.metricLabel}>
            <IconFlame size={16} />
            Lead intent score
          </span>
          <strong className="tnum">{lead.intentScore}</strong>
        </div>

        <details className={s.fold}>
          <summary>ICP fit breakdown</summary>
          <div className={s.breakdown}>
            {lead.icpBreakdown.map((b) => (
              <div key={b.label}>
                <div className={s.barLabel}>
                  <span>{b.label}</span>
                  <span className="tnum">{b.pct}%</span>
                </div>
                <div className={s.track}>
                  <span data-tone={scoreTone(b.pct)} style={{ '--pct': `${b.pct}%` } as CSSProperties} />
                </div>
              </div>
            ))}
          </div>
        </details>

        {lead.journey.length > 0 && (
          <details className={s.fold}>
            <summary>How we got here</summary>
            <ol className={s.timeline}>
              {lead.journey.map((j) => (
                <li key={j.date + j.text}>
                  <div className={s.when}>
                    {j.date} <span>{j.channel}</span>
                  </div>
                  <p>{j.text}</p>
                </li>
              ))}
            </ol>
          </details>
        )}

        {lead.signals.length > 0 && (
          <details className={s.fold} open>
            <summary>Where we picked up signals</summary>
            <ul className={s.signals}>
              {lead.signals.map((sig) => {
                const SignalIcon = SIGNAL_ICON[sig.category] ?? IconTag
                return (
                  <li key={sig.category}>
                    <div className={s.signalName}>
                      <SignalIcon size={16} />
                      {sig.category}
                    </div>
                    <p>{sig.text}</p>
                  </li>
                )
              })}
            </ul>
          </details>
        )}

        <details className={s.fold} open>
          <summary>Pre-call notes</summary>
          <ul className={s.notes}>
            {lead.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      </div>
    </Modal>
  )
}

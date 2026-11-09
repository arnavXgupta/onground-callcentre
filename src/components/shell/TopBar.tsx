import { useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  IconBell,
  IconChartBar,
  IconDialpad,
  IconFlame,
  IconPhoneCall,
  IconStarFilled,
  IconTrophy,
  IconUsers,
  IconBarbell,
  type Icon,
} from '@tabler/icons-react'
import { useCall, type DeviceStatus } from '../../calling/CallProvider'
import DialPad from '../../calling/DialPad'
import { agent, notifications } from '../../data'
import type { NotificationKind } from '../../data/types'
import s from './Shell.module.css'

const SECTION: Record<string, string> = {
  dashboard: 'Dashboard',
  plan: 'Plan',
  calendar: 'Calendar',
  pulse: 'Pulse',
}

const KIND_ICON: Record<NotificationKind, Icon> = {
  team: IconUsers,
  callback: IconPhoneCall,
  practise: IconBarbell,
  win: IconTrophy,
  streak: IconFlame,
  report: IconChartBar,
}

const NOTIF_POP = 'notifications-popover'
const USER_POP = 'user-popover'
const DIAL_POP = 'dialpad-popover'

const STATUS_LABEL: Record<DeviceStatus, string> = {
  offline: 'Go online',
  connecting: 'Connecting…',
  online: 'Online',
  mic_blocked: 'Mic blocked',
  error: 'Offline · retry',
}

/** Inbound availability. Clicking is the user gesture that grants the mic and registers the device (D16). */
function Availability() {
  const { status, statusDetail, goOnline, goOffline } = useCall()
  const title =
    status === 'online' ? 'Ready for inbound calls. Click to go offline.' : (statusDetail ?? 'Go online to receive inbound calls')
  return (
    <button
      type="button"
      className={s.availability}
      data-status={status}
      disabled={status === 'connecting'}
      onClick={() => (status === 'online' ? goOffline() : goOnline())}
      title={title}
    >
      <span className={s.statusDot} />
      {STATUS_LABEL[status]}
    </button>
  )
}

export default function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [seen, setSeen] = useState(false)
  const { call, place } = useCall()
  const section = SECTION[pathname.split('/')[1]] ?? ''

  function go(to: string) {
    document.getElementById(NOTIF_POP)?.hidePopover?.() // jsdom has no popover API
    navigate(to)
  }

  return (
    <header className={s.topbar}>
      <div className={s.title}>
        <span className={s.logo}>OG</span>
        <span className={s.titleText}>{section}</span>
      </div>

      <div className={s.actions}>
        <Availability />

        <button
          type="button"
          className={s.iconBtn}
          popoverTarget={DIAL_POP}
          disabled={call.phase !== 'idle'}
          aria-label="Dial pad"
        >
          <IconDialpad size={18} stroke={1.75} />
        </button>

        <button
          type="button"
          className={s.iconBtn}
          popoverTarget={NOTIF_POP}
          onClick={() => setSeen(true)}
          aria-label={seen ? 'Notifications' : 'Notifications, unread'}
        >
          <IconBell size={18} stroke={1.75} />
          {!seen && <span className={s.dot} data-testid="unread-dot" />}
        </button>

        <div
          className={s.scoreChip}
          title={`OG Score ${agent.ogScore} (▲${agent.ogDelta}) · Rank #${agent.rank} in ${agent.rankScope}`}
        >
          <span className={`${s.scoreRing} tnum`} style={{ '--score': agent.ogScore } as CSSProperties}>
            {agent.ogScore}
          </span>
          <span className={`${s.rank} tnum`}>
            <IconStarFilled size={12} />#{agent.rank}
          </span>
        </div>

        <button className={s.avatar} popoverTarget={USER_POP} aria-label="Account">
          {agent.initials}
        </button>
      </div>

      <div id={NOTIF_POP} popover="auto" className={s.popover}>
        <div className={s.popHead}>Notifications</div>
        <ul className={s.notifList}>
          {notifications.map((n) => {
            const KindIcon = KIND_ICON[n.kind]
            return (
              <li key={n.id} className={s.notif}>
                <span className={s.notifIcon} data-kind={n.kind}>
                  <KindIcon size={16} stroke={1.75} />
                </span>
                <div className={s.notifBody}>
                  <p>{n.title}</p>
                  <div className={s.notifMeta}>
                    <span>{n.time}</span>
                    {n.cta && (
                      <button className={s.link} onClick={() => go(n.cta!.to)}>
                        {n.cta.label}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div id={DIAL_POP} popover="auto" className={`${s.popover} ${s.dialPop}`}>
        <DialPad
          onCall={(number) => {
            document.getElementById(DIAL_POP)?.hidePopover?.()
            place({ name: number, number })
          }}
        />
      </div>

      <div id={USER_POP} popover="auto" className={s.popover}>
        <div className={s.userCard}>
          <span className={s.avatarLg}>{agent.initials}</span>
          <div>
            <div className={s.userName}>{agent.name}</div>
            <div className={s.userMeta}>{agent.role}</div>
            <div className={s.userMeta}>
              {agent.company} · {agent.store}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

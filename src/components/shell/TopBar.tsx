import { useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  IconBell,
  IconChartBar,
  IconFlame,
  IconPhoneCall,
  IconStarFilled,
  IconTrophy,
  IconUsers,
  IconBarbell,
  type Icon,
} from '@tabler/icons-react'
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

export default function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [seen, setSeen] = useState(false)
  const section = SECTION[pathname.split('/')[1]] ?? ''

  function go(to: string) {
    document.getElementById(NOTIF_POP)?.hidePopover?.() // jsdom has no popover API
    navigate(to)
  }

  return (
    <header className={s.topbar}>
      <div className={s.title}>
        <span className={s.logo}>OG</span>
        {section}
      </div>

      <div className={s.actions}>
        <button
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

import { NavLink } from 'react-router'
import {
  IconCalendar,
  IconHistory,
  IconLayoutDashboard,
  IconMessages,
  IconPhone,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconPhoneRinging,
  type Icon,
} from '@tabler/icons-react'
import s from './Shell.module.css'

interface Item {
  to: string
  label: string
  icon: Icon
  children?: Item[]
}

const ITEMS: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  {
    // "/plan" redirects to Calls to make, and NavLink keeps Plan active on every /plan/* route.
    to: '/plan',
    label: 'Plan',
    icon: IconPhone,
    children: [
      { to: '/plan/outgoing', label: 'Calls to make', icon: IconPhoneOutgoing },
      { to: '/plan/incoming', label: 'Incoming', icon: IconPhoneIncoming },
      { to: '/plan/recent', label: 'Recent', icon: IconHistory },
      { to: '/plan/practise', label: 'Practise a call', icon: IconPhoneRinging },
    ],
  },
  { to: '/calendar', label: 'Calendar', icon: IconCalendar },
  { to: '/pulse', label: 'Pulse', icon: IconMessages },
]

const cls = ({ isActive }: { isActive: boolean }) => (isActive ? `${s.navItem} ${s.active}` : s.navItem)
const subCls = ({ isActive }: { isActive: boolean }) => (isActive ? `${s.subItem} ${s.active}` : s.subItem)

export default function Nav() {
  return (
    <nav className={s.nav} aria-label="Main">
      <div className={s.wordmark}>
        <span className={s.logo}>OG</span>
        On-Ground.ai
      </div>
      <ul className={s.navList}>
        {ITEMS.map(({ to, label, icon: Icon, children }) => (
          <li key={to}>
            {/* parents are "where you are", the sub-item is "the page" */}
            <NavLink to={to} className={cls} aria-current={children ? 'true' : 'page'}>
              <span className={s.navIcon}>
                <Icon size={18} stroke={1.75} />
              </span>
              <span className={s.navLabel}>{label}</span>
            </NavLink>
            {children && (
              <ul className={s.subList}>
                {children.map(({ to: subTo, label: subLabel, icon: SubIcon }) => (
                  <li key={subTo}>
                    <NavLink to={subTo} className={subCls} end>
                      <SubIcon size={16} stroke={1.75} />
                      {subLabel}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

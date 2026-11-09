import { Navigate, NavLink, useParams } from 'react-router'
import PageHeader from '../../components/ui/PageHeader'
import { todayChip } from '../../lib/format'
import Incoming from './Incoming'
import Outgoing from './Outgoing'
import Practise from './Practise'
import Recent from './Recent'
import { isPlanTab, PLAN_TABS, type PlanTab } from './tabs'
import s from './Plan.module.css'

const PANELS: Partial<Record<PlanTab, () => React.JSX.Element>> = {
  outgoing: Outgoing,
  incoming: Incoming,
  recent: Recent,
  practise: Practise,
}

export default function PlanLayout() {
  const { tab } = useParams()
  if (!isPlanTab(tab)) return <Navigate to="/plan/outgoing" replace />
  const Panel = PANELS[tab]

  return (
    <div className={s.page}>
      <PageHeader eyebrow="Today's calling plan" title="Planner">
        <span className={`${s.dateChip} tnum`}>{todayChip()}</span>
      </PageHeader>

      {/* Phone only: the sidebar's plan sub-items become a segmented control. */}
      <nav className={s.segmented} aria-label="Plan sections">
        {PLAN_TABS.map((t) => (
          <NavLink key={t.tab} to={`/plan/${t.tab}`} className={({ isActive }) => (isActive ? s.segActive : undefined)}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      {Panel ? <Panel /> : <h2>{PLAN_TABS.find((t) => t.tab === tab)?.label}</h2>}
    </div>
  )
}

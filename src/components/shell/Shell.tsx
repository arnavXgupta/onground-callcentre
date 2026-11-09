import { Outlet, useSearchParams } from 'react-router'
import CallDock from '../../calling/CallDock'
import LeadsModal from '../../screens/leads/LeadsModal'
import Nav from './Nav'
import TopBar from './TopBar'
import s from './Shell.module.css'

export default function Shell() {
  const [params] = useSearchParams()

  return (
    <div className={s.shell}>
      <Nav />
      <div className={s.main}>
        <TopBar />
        <main className={s.content}>
          <Outlet />
        </main>
      </div>
      <CallDock />
      {/* keyed so ?leads=<id> reopens at that lead */}
      {params.has('leads') && <LeadsModal key={params.get('leads') ?? ''} />}
    </div>
  )
}

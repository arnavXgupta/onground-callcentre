import { Outlet } from 'react-router'
import Nav from './Nav'
import TopBar from './TopBar'
import s from './Shell.module.css'

export default function Shell() {
  return (
    <div className={s.shell}>
      <Nav />
      <div className={s.main}>
        <TopBar />
        <main className={s.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

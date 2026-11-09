import { Navigate, Route, Routes } from 'react-router'
import { CallProvider } from './calling/CallProvider'
import Shell from './components/shell/Shell'
import Calendar from './screens/calendar/Calendar'
import Dashboard from './screens/dashboard/Dashboard'
import PlanLayout from './screens/plan/PlanLayout'
import Channel from './screens/pulse/Channel'
import PulseHome from './screens/pulse/PulseHome'

export default function App() {
  return (
    <CallProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plan" element={<Navigate to="/plan/outgoing" replace />} />
          <Route path="/plan/:tab" element={<PlanLayout />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/pulse" element={<PulseHome />} />
          <Route path="/pulse/:channel" element={<Channel />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </CallProvider>
  )
}

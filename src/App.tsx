import { Navigate, Route, Routes } from 'react-router'
import { CallProvider } from './calling/CallProvider'
import Shell from './components/shell/Shell'
import Dashboard from './screens/dashboard/Dashboard'
import PlanLayout from './screens/plan/PlanLayout'
import Channel from './screens/pulse/Channel'
import PulseHome from './screens/pulse/PulseHome'

// Placeholder screens: each feature (02+) replaces one of these.
function Screen({ title }: { title: string }) {
  return <h1>{title}</h1>
}

export default function App() {
  return (
    <CallProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plan" element={<Navigate to="/plan/outgoing" replace />} />
          <Route path="/plan/:tab" element={<PlanLayout />} />
          <Route path="/calendar" element={<Screen title="Calendar" />} />
          <Route path="/pulse" element={<PulseHome />} />
          <Route path="/pulse/:channel" element={<Channel />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </CallProvider>
  )
}

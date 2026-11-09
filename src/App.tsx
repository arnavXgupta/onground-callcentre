import { Navigate, Route, Routes, useParams } from 'react-router'
import { CallProvider } from './calling/CallProvider'
import Shell from './components/shell/Shell'
import PlanLayout from './screens/plan/PlanLayout'

// Placeholder screens: each feature (02+) replaces one of these.
function Screen({ title }: { title: string }) {
  return <h1>{title}</h1>
}

function ChannelRoute() {
  const { channel } = useParams()
  return <Screen title={`Pulse · ${channel}`} />
}

export default function App() {
  return (
    <CallProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Screen title="Dashboard" />} />
          <Route path="/plan" element={<Navigate to="/plan/outgoing" replace />} />
          <Route path="/plan/:tab" element={<PlanLayout />} />
          <Route path="/calendar" element={<Screen title="Calendar" />} />
          <Route path="/pulse" element={<Screen title="Pulse" />} />
          <Route path="/pulse/:channel" element={<ChannelRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </CallProvider>
  )
}

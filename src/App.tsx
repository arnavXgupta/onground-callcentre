import { Navigate, Route, Routes, useParams } from 'react-router'

export const PLAN_TABS = ['outgoing', 'incoming', 'recent', 'practise'] as const
export type PlanTab = (typeof PLAN_TABS)[number]

// Placeholder screens: each feature (02+) replaces one of these.
function Screen({ title }: { title: string }) {
  return <h1>{title}</h1>
}

function PlanRoute() {
  const { tab } = useParams()
  if (!PLAN_TABS.includes(tab as PlanTab)) return <Navigate to="/plan/outgoing" replace />
  return <Screen title={`Plan · ${tab}`} />
}

function ChannelRoute() {
  const { channel } = useParams()
  return <Screen title={`Pulse · ${channel}`} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Screen title="Dashboard" />} />
      <Route path="/plan" element={<Navigate to="/plan/outgoing" replace />} />
      <Route path="/plan/:tab" element={<PlanRoute />} />
      <Route path="/calendar" element={<Screen title="Calendar" />} />
      <Route path="/pulse" element={<Screen title="Pulse" />} />
      <Route path="/pulse/:channel" element={<ChannelRoute />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

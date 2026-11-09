import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAt } from './render'

describe('routing', () => {
  it.each([
    ['/dashboard', 'Dashboard'],
    ['/plan/outgoing', 'Planned outgoing calls'],
    ['/plan/incoming', 'Missed calls'],
    ['/plan/recent', 'Recent calls'],
    ['/plan/practise', 'Practise'],
    ['/calendar', 'Calendar'],
    ['/pulse', 'Pulse'],
    ['/pulse/callcentre-team', '#callcentre-team'],
  ])('%s renders its screen', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('/ redirects to the dashboard', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('unknown paths fall back to the dashboard', () => {
    renderAt('/nope/nothing')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('an unknown plan tab falls back to Calls to make', () => {
    renderAt('/plan/nonsense')
    expect(screen.getByRole('heading', { name: 'Planned outgoing calls' })).toBeInTheDocument()
  })

  it('/plan alone opens Calls to make', () => {
    renderAt('/plan')
    expect(screen.getByRole('heading', { name: 'Planned outgoing calls' })).toBeInTheDocument()
  })
})

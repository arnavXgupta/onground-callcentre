import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAt } from './render'

describe('routing', () => {
  it.each([
    ['/dashboard', 'Dashboard'],
    ['/plan/outgoing', 'Plan · outgoing'],
    ['/plan/incoming', 'Plan · incoming'],
    ['/plan/recent', 'Plan · recent'],
    ['/plan/practise', 'Plan · practise'],
    ['/calendar', 'Calendar'],
    ['/pulse', 'Pulse'],
    ['/pulse/callcentre-team', 'Pulse · callcentre-team'],
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
    expect(screen.getByRole('heading', { name: 'Plan · outgoing' })).toBeInTheDocument()
  })

  it('/plan alone opens Calls to make', () => {
    renderAt('/plan')
    expect(screen.getByRole('heading', { name: 'Plan · outgoing' })).toBeInTheDocument()
  })
})

import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callLog } from '../../src/calling/callLog'
import { createTwilioDevice } from '../../src/calling/device'
import { renderAt } from './render'

vi.mock('../../src/calling/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/calling/device')>()
  return { ...actual, createTwilioDevice: vi.fn() }
})

beforeEach(() => callLog.clear())
afterEach(() => vi.useRealTimers())

const practice = () => screen.getByRole('region', { name: 'Practice call' })
const line = () => within(practice()).getByText(/line \d of \d/)

async function startRitu() {
  const r = renderAt('/plan/practise')
  await r.user.click(screen.getByRole('button', { name: 'Practise with Ritu S.' }))
  return r
}

describe('Practise a call', () => {
  it('offers three scenarios built from real leads', () => {
    renderAt('/plan/practise')
    expect(screen.getByRole('heading', { name: 'Practise a call' })).toBeInTheDocument()
    const cards = screen.getAllByRole('button', { name: /^Practise with / }).map((b) => b.getAttribute('aria-label'))
    expect(cards).toEqual(['Practise with Ritu S.', 'Practise with Kavitha R.', 'Practise with Faizan A.'])
    expect(screen.getByText('Price objection · SLA missed')).toBeInTheDocument()
  })

  it('runs the script line by line and stops at the end', async () => {
    const { user } = await startRitu()
    expect(line()).toHaveTextContent('Ritu S. · line 1 of 6')
    expect(practice()).toHaveTextContent('I visited your RT Nagar store last week.')
    for (let i = 0; i < 5; i++) await user.click(within(practice()).getByRole('button', { name: 'Next line' }))
    expect(line()).toHaveTextContent('line 6 of 6')
    expect(within(practice()).getByRole('button', { name: 'End of script' })).toBeDisabled()
  })

  it('the timer runs while practising', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], shouldAdvanceTime: true })
    await startRitu()
    act(() => vi.advanceTimersByTime(65_000))
    expect(within(practice()).getByLabelText('Practice time')).toHaveTextContent('01:05')
  })

  it('the hint follows the first step not yet ticked, personalised to the lead', async () => {
    const { user } = await startRitu()
    const hint = () => within(practice()).getByRole('note')
    expect(hint()).toHaveTextContent('Opening & intent confirm: “Hi Ritu, this is Arvind')
    await user.click(within(practice()).getByRole('checkbox', { name: 'Opening & intent confirm' }))
    await user.click(within(practice()).getByRole('checkbox', { name: 'Needs discovery' }))
    expect(hint()).toHaveTextContent('Product pitch: “Given that, the Smart Luxe Mattress is the right fit')
    await user.click(within(practice()).getByRole('checkbox', { name: 'Needs discovery' }))
    expect(hint()).toHaveTextContent('Needs discovery')
  })

  it('ending gives feedback: score, missed steps with tips', async () => {
    const { user } = await startRitu()
    for (const step of ['Opening & intent confirm', 'Needs discovery', 'Product pitch', 'Closing / callback booking']) {
      await user.click(within(practice()).getByRole('checkbox', { name: step }))
    }
    await user.click(screen.getByRole('button', { name: 'End practice' }))

    const feedback = screen.getByRole('region', { name: 'Practice feedback' })
    expect(within(feedback).getByRole('meter', { name: 'Steps covered' })).toHaveAttribute('aria-valuenow', '67')
    expect(feedback).toHaveTextContent('4 of 6 steps')
    expect(feedback).toHaveTextContent('EMI / financing mention')
    expect(feedback).toHaveTextContent('Bring up EMI before price turns into the objection.')
    expect(feedback).toHaveTextContent('Warranty mention')
    expect(feedback).not.toHaveTextContent('Needs discovery')
  })

  it('practise again restarts the same scenario; pick another goes back to the list', async () => {
    const { user } = await startRitu()
    await user.click(screen.getByRole('button', { name: 'End practice' }))
    expect(screen.getByRole('region', { name: 'Practice feedback' })).toHaveTextContent('0%')

    await user.click(screen.getByRole('button', { name: 'Practise again' }))
    expect(line()).toHaveTextContent('Ritu S. · line 1 of 6')
    expect(within(practice()).queryAllByRole('checkbox', { checked: true })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'End practice' }))
    await user.click(screen.getByRole('button', { name: 'Pick another' }))
    expect(screen.getAllByRole('button', { name: /^Practise with / })).toHaveLength(3)
  })

  it('never dials or logs anything', async () => {
    const { user } = await startRitu()
    await user.click(screen.getByRole('button', { name: 'End practice' }))
    expect(createTwilioDevice).not.toHaveBeenCalled()
    expect(callLog.getSnapshot()).toHaveLength(0)
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
  })
})

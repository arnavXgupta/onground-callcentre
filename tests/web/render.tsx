import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../../src/App'

/** Render the whole app at a URL, with a userEvent instance ready to drive it. */
export function renderAt(path: string) {
  const user = userEvent.setup()
  return { user, ...render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>) }
}

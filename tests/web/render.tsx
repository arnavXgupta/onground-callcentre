import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../../src/App'

/** Render the whole app at a URL, with a userEvent instance ready to drive it. `extra` renders inside the router. */
export function renderAt(path: string, extra?: ReactNode) {
  const user = userEvent.setup({ delay: null }) // no timer between keystrokes: much faster typing
  return {
    user,
    ...render(
      <MemoryRouter initialEntries={[path]}>
        <App />
        {extra}
      </MemoryRouter>,
    ),
  }
}

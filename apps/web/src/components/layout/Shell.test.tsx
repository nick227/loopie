import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useCreateLandingPage,
  useCurrentUser,
  useLandingPageTemplates,
  useLogout,
} from '@project/sdk'
import { Shell } from './Shell'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useCurrentUser: vi.fn(),
  useLogout: vi.fn(),
  // Shell's header renders CreateMenu unconditionally, which calls useQuickCreatePage — real
  // react-query hooks that need mocking here the same way every other page test mocks the SDK
  // hooks its rendered tree touches (there's no global QueryClientProvider test wrapper).
  useLandingPageTemplates: vi.fn(),
  useCreateLandingPage: vi.fn(),
}))

describe('Shell profile navigation', () => {
  it('links the header avatar to the private profile', async () => {
    const user = userEvent.setup()
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { data: { email: 'owner@example.com', role: 'ADMIN' } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useLogout).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useLogout>)
    vi.mocked(useLandingPageTemplates).mockReturnValue({
      isLoading: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useLandingPageTemplates>)
    vi.mocked(useCreateLandingPage).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useCreateLandingPage>)

    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/inbox" element={<p>Inbox</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    // The header avatar is the MoreMenu's trigger (a circular button showing the user's
    // initial, aria-label "Menu") — it opens the account menu rather than linking directly;
    // "Profile" inside that menu is the actual link to the private profile.
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
  })
})

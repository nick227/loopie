import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentUser, useLogout } from '@project/sdk'
import { Shell } from './Shell'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useCurrentUser: vi.fn(),
  useLogout: vi.fn(),
}))

describe('Shell profile navigation', () => {
  it('links the header avatar to the private profile', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { data: { email: 'owner@example.com', role: 'ADMIN' } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useLogout).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useLogout>)

    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/inbox" element={<p>Inbox</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Open private profile' })).toHaveAttribute(
      'href',
      '/profile',
    )
  })
})

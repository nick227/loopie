import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from '@project/sdk'
import { BusinessDefaultRoute, LegacyHomeRoute, RequireNonAffiliate } from './RequireRole'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useCurrentUser: vi.fn(),
}))

describe('RequireNonAffiliate', () => {
  it('redirects affiliates away from shop routes', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: { role: 'AFFILIATE' } },
    } as ReturnType<typeof useCurrentUser>)
    render(
      <MemoryRouter initialEntries={['/contacts']}>
        <Routes>
          <Route element={<RequireNonAffiliate />}>
            <Route path="/contacts" element={<p>Contacts</p>} />
          </Route>
          <Route path="/portal" element={<p>Affiliate portal</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Affiliate portal')).toBeInTheDocument()
    expect(screen.queryByText('Contacts')).not.toBeInTheDocument()
  })
})

describe('business landing routes', () => {
  it('uses Calendar as the default destination', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      isLoading: false,
      data: { data: { role: 'ADMIN', businessIdentityCompletedAt: '2026-01-01T00:00:00.000Z' } },
    } as ReturnType<typeof useCurrentUser>)

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<BusinessDefaultRoute />} />
          <Route path="/calendar" element={<p>Calendar</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('sends the retired Home URL to the combined private profile', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      isLoading: false,
      data: { data: { role: 'ADMIN', businessIdentityCompletedAt: '2026-01-01T00:00:00.000Z' } },
    } as ReturnType<typeof useCurrentUser>)

    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<LegacyHomeRoute />} />
          <Route path="/profile" element={<p>Private profile</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Private profile')).toBeInTheDocument()
  })
})

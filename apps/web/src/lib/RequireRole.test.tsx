import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from '@project/sdk'
import { RequireNonAffiliate } from './RequireRole'

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

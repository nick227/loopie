import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from '@project/sdk'
import { BusinessAdminLayout } from '@/components/layout/BusinessAdminLayout'
import { ProfilePage } from './ProfilePage'

vi.mock('@project/sdk', () => ({
  useCurrentUser: vi.fn(),
}))
vi.mock('@/components/business/BusinessHeader', () => ({
  BusinessHeader: () => <h1>Midnight Creative</h1>,
}))
vi.mock('@/components/welcome/WelcomeSection', () => ({
  WelcomeSection: () => <form aria-label="Business details" />,
}))
vi.mock('@/hooks/useOverviewScroll', () => ({
  useRestoreOverviewScroll: vi.fn(),
}))

const views = [
  ['/profile', 'Profile'],
  ['/permissions', 'Permissions'],
  ['/team', 'Team'],
  ['/billing', 'Billing'],
  ['/affiliate-program', 'Affiliate'],
  ['/audit', 'Audit'],
  ['/team/members/user-1', 'Team'],
]

describe('Business profile views', () => {
  it.each(views)('renders the shared header and active navigation at %s', (path, label) => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { data: { platformRole: 'USER' } },
    } as unknown as ReturnType<typeof useCurrentUser>)

    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<BusinessAdminLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            {views
              .filter(([route]) => route !== '/profile')
              .map(([route]) => (
                <Route key={route} path={route} element={<div>Selected view</div>} />
              ))}
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('heading', { name: 'Midnight Creative' })).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Business settings' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    if (path === '/profile') {
      expect(screen.getByRole('form', { name: 'Business details' })).toBeInTheDocument()
    } else {
      expect(screen.getByText('Selected view')).toBeInTheDocument()
    }
  })
})

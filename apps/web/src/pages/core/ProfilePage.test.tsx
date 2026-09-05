import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useBilling,
  useBusiness,
  useBusinessTeam,
  useCurrentUser,
  useHomeSummary,
  useLogout,
  useMyBusinesses,
  useSetActiveBusiness,
} from '@project/sdk'
import { ProfilePage } from './ProfilePage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useBilling: vi.fn(),
  useBusiness: vi.fn(),
  useCurrentUser: vi.fn(),
  useHomeSummary: vi.fn(),
  useLogout: vi.fn(),
  useMyBusinesses: vi.fn(),
  useBusinessTeam: vi.fn(),
  useSetActiveBusiness: vi.fn(),
}))

describe('ProfilePage', () => {
  it('shows account identity without the permissions ledger', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        data: {
          id: 'user-1',
          email: 'owner@example.com',
          businessId: 'business-1',
          businessName: 'Midnight Creative',
          platformRole: 'SITE_ADMIN',
          membershipRole: 'OWNER',
          isFounder: true,
          jobTitle: 'Founder',
          subscriptionStatus: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useMyBusinesses).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: [
          {
            id: 'business-1',
            name: 'Midnight Creative',
            logoUrl: null,
            role: 'OWNER',
            isFounder: true,
            jobTitle: 'Founder',
            active: true,
          },
        ],
      },
    } as unknown as ReturnType<typeof useMyBusinesses>)
    vi.mocked(useBusinessTeam).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: {
          members: [
            {
              userId: 'user-1',
              email: 'owner@example.com',
              role: 'OWNER',
              isFounder: true,
              jobTitle: 'Founder',
              suspendedAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          invitations: [],
          canManage: true,
        },
      },
    } as unknown as ReturnType<typeof useBusinessTeam>)
    vi.mocked(useSetActiveBusiness).mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useSetActiveBusiness>)
    vi.mocked(useBilling).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: { subscriptionStatus: 'active', configured: true, planName: 'Loopie Pro' } },
    } as unknown as ReturnType<typeof useBilling>)
    vi.mocked(useBusiness).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: {
          id: 'business-1',
          name: 'Midnight Creative',
          location: 'Austin, TX',
          industry: 'Creative services',
          socialProfiles: [],
          slug: 'midnight-creative',
        },
      },
    } as unknown as ReturnType<typeof useBusiness>)
    vi.mocked(useLogout).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useLogout>)
    vi.mocked(useHomeSummary).mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHomeSummary>)

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('heading', { name: 'Permissions' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Midnight Creative' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View public profile' })).toHaveAttribute(
      'href',
      '/b/midnight-creative',
    )
    expect(screen.getByRole('heading', { name: 'Your team' })).toBeInTheDocument()
  })
})

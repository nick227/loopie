import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useBilling,
  useCurrentUser,
  useDisconnectIntegration,
  useDisconnectPlatformConnection,
  useIntegrations,
  useLogout,
  usePlatformConnection,
} from '@project/sdk'
import { ProfilePage } from './ProfilePage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useBilling: vi.fn(),
  useCurrentUser: vi.fn(),
  useDisconnectIntegration: vi.fn(),
  useDisconnectPlatformConnection: vi.fn(),
  useIntegrations: vi.fn(),
  useLogout: vi.fn(),
  usePlatformConnection: vi.fn(),
}))

describe('ProfilePage', () => {
  it('shows active permissions and removes access after confirmation', async () => {
    const disconnect = vi.fn().mockResolvedValue({})
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        data: {
          id: 'user-1',
          email: 'owner@example.com',
          businessId: 'business-1',
          businessName: 'Midnight Creative',
          role: 'ADMIN',
          subscriptionStatus: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useBilling).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: { subscriptionStatus: 'active', configured: true, planName: 'Loopie Pro' } },
    } as unknown as ReturnType<typeof useBilling>)
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pages: [{ data: [], meta: { hasMore: false, nextCursor: null } }] },
    } as unknown as ReturnType<typeof useIntegrations>)
    vi.mocked(usePlatformConnection).mockImplementation(
      (platform) =>
        ({
          isLoading: false,
          isError: false,
          data: {
            data: {
              platform,
              status: platform === 'META' ? 'CONNECTED' : 'DISCONNECTED',
              adAccountId: platform === 'META' ? 'act-42' : null,
              pageId: null,
              defaultCountry: 'US',
              configured: true,
              capabilities: {
                oauth: true,
                mappingFields: [],
                pushDraft: true,
                pullSpend: true,
                activate: true,
              },
            },
          },
        }) as unknown as ReturnType<typeof usePlatformConnection>,
    )
    vi.mocked(useDisconnectPlatformConnection).mockReturnValue({
      isPending: false,
      mutateAsync: disconnect,
    } as unknown as ReturnType<typeof useDisconnectPlatformConnection>)
    vi.mocked(useDisconnectIntegration).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDisconnectIntegration>)
    vi.mocked(useLogout).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useLogout>)

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Access currently in use')).toBeInTheDocument()
    expect(screen.getByText('Ad account act-42')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Remove access' }))
    await user.click(screen.getAllByRole('button', { name: 'Remove access' }).at(-1)!)
    expect(disconnect).toHaveBeenCalledWith('META')
  })
})

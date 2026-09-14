import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useCreateIntegration,
  useCrmCatalog,
  useDisconnectIntegration,
  useDisconnectPlatformConnection,
  useIntegrations,
  usePlatformConnection,
  usePreviewIntegration,
  useStartCrmOAuth,
  useStartPlatformOAuth,
  useSyncIntegration,
} from '@project/sdk'
import { ConnectionsPage } from './ConnectionsPage'

// Regression coverage for the 2026-09-14 consolidation: /permissions (revoke-only audit list)
// and /integrations (CRM-only management) are replaced by one canonical /connections page,
// grouped by purpose (Customer & data / Advertising) with a compact Access & permissions
// section at the bottom, instead of two similar destinations serving overlapping jobs.
const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  disconnectIntegration: vi.fn().mockResolvedValue(undefined),
  disconnectPlatform: vi.fn().mockResolvedValue(undefined),
  startPlatformOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://meta.example/oauth' } }),
}))

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useCrmCatalog: vi.fn(),
  useIntegrations: vi.fn(),
  useCreateIntegration: vi.fn(),
  useStartCrmOAuth: vi.fn(),
  useSyncIntegration: vi.fn(),
  usePreviewIntegration: vi.fn(),
  useDisconnectIntegration: vi.fn(),
  usePlatformConnection: vi.fn(),
  useStartPlatformOAuth: vi.fn(),
  useDisconnectPlatformConnection: vi.fn(),
}))

function show() {
  render(
    <MemoryRouter initialEntries={['/connections?connected=HUBSPOT']}>
      <ConnectionsPage />
    </MemoryRouter>,
  )
}

// Keeps the Advertising section's cards inert (no Disconnect/Reconnect buttons of their own) so a
// test can assert on a single CRM card's buttons without also matching Meta's default-CONNECTED
// fixture from the shared beforeEach.
function disableAllPlatforms() {
  vi.mocked(usePlatformConnection).mockImplementation(
    (platform) =>
      ({
        isLoading: false,
        isError: false,
        data: {
          data: {
            platform,
            status: 'DISCONNECTED',
            adAccountId: null,
            configured: true,
            capabilities: { pullSpend: true, mappingFields: [] },
          },
        },
      }) as unknown as ReturnType<typeof usePlatformConnection>,
  )
}

describe('ConnectionsPage', () => {
  beforeEach(() => {
    vi.mocked(useCrmCatalog).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            provider: 'HUBSPOT',
            label: 'HubSpot',
            availability: 'LIVE',
            oauth: true,
            configured: true,
            capabilities: { contacts: true, deals: true },
          },
        ],
      },
    } as unknown as ReturnType<typeof useCrmCatalog>)

    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'int-1',
                provider: 'HUBSPOT',
                status: 'CONNECTED',
                lastSyncAt: '2026-09-14T16:59:00.000Z',
                lastSyncCreated: 2,
                lastSyncLinked: 0,
                capabilities: { contacts: true, deals: true },
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useIntegrations>)

    vi.mocked(useCreateIntegration).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateIntegration>)
    vi.mocked(useStartCrmOAuth).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useStartCrmOAuth>)
    vi.mocked(useSyncIntegration).mockReturnValue({
      mutate: mocks.sync,
      isPending: false,
    } as unknown as ReturnType<typeof useSyncIntegration>)
    vi.mocked(usePreviewIntegration).mockReturnValue({
      mutateAsync: vi.fn(),
      data: undefined,
    } as unknown as ReturnType<typeof usePreviewIntegration>)
    vi.mocked(useDisconnectIntegration).mockReturnValue({
      mutateAsync: mocks.disconnectIntegration,
      isPending: false,
    } as unknown as ReturnType<typeof useDisconnectIntegration>)

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
              configured: true,
              capabilities: { pullSpend: true, mappingFields: [] },
            },
          },
        }) as unknown as ReturnType<typeof usePlatformConnection>,
    )
    vi.mocked(useStartPlatformOAuth).mockReturnValue({
      mutateAsync: mocks.startPlatformOAuth,
      isPending: false,
    } as unknown as ReturnType<typeof useStartPlatformOAuth>)
    vi.mocked(useDisconnectPlatformConnection).mockReturnValue({
      mutateAsync: mocks.disconnectPlatform,
      isPending: false,
    } as unknown as ReturnType<typeof useDisconnectPlatformConnection>)

    mocks.sync.mockClear()
    mocks.disconnectIntegration.mockClear()
    mocks.disconnectPlatform.mockClear()
    mocks.startPlatformOAuth.mockClear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('groups connections into Customer & data and Advertising, each with the same card grammar', () => {
    show()
    expect(screen.getByText('Customer & data')).toBeInTheDocument()
    expect(screen.getByText('Advertising')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'HubSpot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Meta' })).toBeInTheDocument()
    // Same grammar: status, purpose, activity, actions — for both a CRM card and a platform card.
    expect(screen.getByText(/2 contacts imported/)).toBeInTheDocument()
    expect(screen.getByText('Ad account act-42')).toBeInTheDocument()
  })

  it("links a connected platform's Manage button to /ads (the current Advertisement/AdRun model), not the legacy /campaigns route", () => {
    show()
    expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/ads')
  })

  it('shows a toast for ?connected= and syncs/disconnects a CRM card from the same card', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(mocks.sync).toHaveBeenCalledWith('int-1')

    fireEvent.click(screen.getAllByRole('button', { name: 'Disconnect' })[0]!)
    expect(mocks.disconnectIntegration).toHaveBeenCalledWith('int-1')
  })

  it('disconnects a connected platform from the same card (previously only possible on the old /permissions page)', () => {
    show()
    const disconnectButtons = screen.getAllByRole('button', { name: 'Disconnect' })
    // Meta is the only CONNECTED platform in this fixture.
    fireEvent.click(disconnectButtons[disconnectButtons.length - 1]!)
    expect(mocks.disconnectPlatform).toHaveBeenCalledWith('META')
  })

  it('renders a compact Access & permissions section without duplicate action buttons', () => {
    show()
    expect(screen.getByText('Access & permissions')).toBeInTheDocument()
    expect(screen.getByText(/Read contacts/)).toBeInTheDocument()
    expect(screen.getByText(/Read advertising spend/)).toBeInTheDocument()
  })

  // Regression coverage for the 2026-09-13 card-grammar fixes: non-OAuth providers (WooCommerce,
  // Webhook) previously had no Disconnect action at all once CONNECTED, and a disconnected
  // WooCommerce row had no way back into the credential form to reconnect.
  it('shows Disconnect for a connected WooCommerce integration, and lets a paused one reconnect via the credential form', () => {
    disableAllPlatforms()
    vi.mocked(useCrmCatalog).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            provider: 'WOOCOMMERCE',
            label: 'WooCommerce',
            availability: 'LIVE',
            oauth: false,
            configured: true,
            capabilities: { contacts: true, orders: true },
          },
        ],
      },
    } as unknown as ReturnType<typeof useCrmCatalog>)
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'woo-1',
                provider: 'WOOCOMMERCE',
                status: 'CONNECTED',
                capabilities: { contacts: true, orders: true },
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useIntegrations>)

    const { rerender } = render(
      <MemoryRouter initialEntries={['/connections']}>
        <ConnectionsPage />
      </MemoryRouter>,
    )
    // Connected: Sync now + Disconnect, no credential form (it's already connected).
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
    expect(screen.queryByLabelText('WooCommerce store URL')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(mocks.disconnectIntegration).toHaveBeenCalledWith('woo-1')

    // Paused (disconnected): the credential form must reappear so the store can be reconnected,
    // and the action button reads "Reconnect" rather than silently offering nothing.
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'woo-1',
                provider: 'WOOCOMMERCE',
                status: 'PAUSED',
                capabilities: { contacts: true, orders: true },
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useIntegrations>)
    rerender(
      <MemoryRouter initialEntries={['/connections']}>
        <ConnectionsPage />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('WooCommerce store URL')).toBeInTheDocument()
    expect(screen.getByLabelText('WooCommerce consumer key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument()
  })

  it('shows Disconnect for a connected Webhook integration even though it has no sync action', () => {
    disableAllPlatforms()
    vi.mocked(useCrmCatalog).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            provider: 'WEBHOOK',
            label: 'Webhook',
            availability: 'LIVE',
            oauth: false,
            configured: true,
            capabilities: {},
          },
        ],
      },
    } as unknown as ReturnType<typeof useCrmCatalog>)
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'wh-1',
                provider: 'WEBHOOK',
                status: 'CONNECTED',
                webhookUrl: 'https://api.example.com/hooks/wh-1',
                capabilities: {},
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useIntegrations>)

    show()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(mocks.disconnectIntegration).toHaveBeenCalledWith('wh-1')
  })

  it('labels an OAuth row that never finished setup "Finish connecting" instead of "Reconnect"', () => {
    disableAllPlatforms()
    vi.mocked(useCrmCatalog).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            provider: 'HUBSPOT',
            label: 'HubSpot',
            availability: 'LIVE',
            oauth: true,
            configured: true,
            capabilities: { contacts: true, deals: true },
          },
        ],
      },
    } as unknown as ReturnType<typeof useCrmCatalog>)
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'hs-1',
                provider: 'HUBSPOT',
                status: 'INCOMPLETE',
                capabilities: { contacts: true, deals: true },
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useIntegrations>)

    show()
    expect(screen.getByRole('button', { name: 'Finish connecting' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument()
  })
})

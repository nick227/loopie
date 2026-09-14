import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IntegrationsPage } from './IntegrationsPage'

// Regression coverage for three 2026-09-13/14 fixes on the same underlying gap: the generic
// integration card only ever offered a button for two states (no row -> Connect, CONNECTED ->
// Sync). Everything else — a row stuck non-CONNECTED (Reconnect), a CONNECTED row with no way
// to force a fresh OAuth handshake (Disconnect), and Reconnect silently sending an empty shop
// domain for SHOPIFY (a real production bug found live: the shop Input only renders on a
// brand-new connection, so it's always '' for an existing row) — rendered/behaved wrong, even
// though the backend operations themselves (CrmOAuthService.start()'s reuse-by-row,
// POST /integrations/{id}/disconnect) already worked.
const mocks = vi.hoisted(() => ({
  startOAuth: vi
    .fn()
    .mockResolvedValue({ data: { url: 'https://app.hubspot.com/oauth/authorize?x=1' } }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  hubspotIntegration: {
    id: 'int-1',
    provider: 'HUBSPOT',
    status: 'INCOMPLETE',
    lastSyncAt: null as string | null,
    externalAccountId: null as string | null,
  },
  shopifyIntegration: {
    id: 'int-2',
    provider: 'SHOPIFY',
    status: 'PAUSED',
    lastSyncAt: null as string | null,
    externalAccountId: 'loopie-biz.myshopify.com',
  },
}))

vi.mock('@project/sdk', () => ({
  useCrmCatalog: () => ({
    isLoading: false,
    data: {
      data: [
        {
          provider: 'HUBSPOT',
          label: 'HubSpot',
          availability: 'LIVE',
          oauth: true,
          configured: true,
          capabilities: {},
        },
        {
          provider: 'SHOPIFY',
          label: 'Shopify',
          availability: 'LIVE',
          oauth: true,
          configured: true,
          capabilities: {},
        },
      ],
    },
  }),
  useIntegrations: () => ({
    isLoading: false,
    data: { pages: [{ data: [mocks.hubspotIntegration, mocks.shopifyIntegration] }] },
  }),
  useCreateIntegration: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartCrmOAuth: () => ({ mutateAsync: mocks.startOAuth, isPending: false }),
  useSyncIntegration: () => ({ mutate: vi.fn(), isPending: false }),
  usePreviewIntegration: () => ({ mutateAsync: vi.fn(), data: undefined }),
  useDisconnectIntegration: () => ({ mutateAsync: mocks.disconnect, isPending: false }),
}))

function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('IntegrationsPage: recovering a stuck non-CONNECTED integration', () => {
  beforeEach(() => {
    mocks.startOAuth.mockClear()
    mocks.disconnect.mockClear()
    mocks.hubspotIntegration.status = 'INCOMPLETE'
    mocks.shopifyIntegration.status = 'PAUSED'
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn() },
      writable: true,
    })
  })

  it('shows a Reconnect button (not nothing) for a row stuck at INCOMPLETE, and it re-runs the OAuth start', () => {
    show()
    expect(screen.getByText('INCOMPLETE')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Reconnect' })
    fireEvent.click(buttons[0]!)
    expect(mocks.startOAuth).toHaveBeenCalledWith({ provider: 'HUBSPOT', shop: undefined })
  })

  it('reconnecting a PAUSED Shopify row sends its own known shop domain, not an empty one', () => {
    show()
    const buttons = screen.getAllByRole('button', { name: 'Reconnect' })
    // Two Reconnect buttons render (HubSpot INCOMPLETE, Shopify PAUSED) — click the Shopify one.
    fireEvent.click(buttons[1]!)
    expect(mocks.startOAuth).toHaveBeenCalledWith({
      provider: 'SHOPIFY',
      shop: 'loopie-biz.myshopify.com',
    })
  })
})

describe('IntegrationsPage: disconnecting a CONNECTED integration', () => {
  beforeEach(() => {
    mocks.disconnect.mockClear()
    mocks.hubspotIntegration.status = 'CONNECTED'
    mocks.shopifyIntegration.status = 'CONNECTED'
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows a Disconnect button alongside Sync now, and it calls the disconnect mutation after confirming', async () => {
    show()
    expect(
      screen.getAllByRole('button', { name: /Sync now|Continue sync/ }).length,
    ).toBeGreaterThan(0)
    const button = screen.getAllByRole('button', { name: 'Disconnect' })[0]!
    fireEvent.click(button)
    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.disconnect).toHaveBeenCalledWith('int-1')
  })
})

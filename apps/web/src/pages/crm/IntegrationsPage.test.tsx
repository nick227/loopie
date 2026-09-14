import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IntegrationsPage } from './IntegrationsPage'

// Regression coverage for two 2026-09-13/14 fixes on the same underlying gap: the generic
// integration card only ever offered a button for two states (no row -> Connect, CONNECTED ->
// Sync). Everything else — a row stuck non-CONNECTED (Reconnect), and a CONNECTED row with no
// way to force a fresh OAuth handshake (Disconnect) — rendered nothing at all, even though both
// backend operations (CrmOAuthService.start()'s reuse-by-row, POST /integrations/{id}/disconnect)
// already worked.
const mocks = vi.hoisted(() => ({
  startOAuth: vi
    .fn()
    .mockResolvedValue({ data: { url: 'https://app.hubspot.com/oauth/authorize?x=1' } }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  integration: {
    id: 'int-1',
    provider: 'HUBSPOT',
    status: 'INCOMPLETE',
    lastSyncAt: null as string | null,
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
      ],
    },
  }),
  useIntegrations: () => ({
    isLoading: false,
    data: { pages: [{ data: [mocks.integration] }] },
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
    mocks.integration.status = 'INCOMPLETE'
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn() },
      writable: true,
    })
  })

  it('shows a Reconnect button (not nothing) for a row stuck at INCOMPLETE, and it re-runs the OAuth start', () => {
    show()
    expect(screen.getByText('INCOMPLETE')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Reconnect' })
    fireEvent.click(button)
    expect(mocks.startOAuth).toHaveBeenCalledWith({ provider: 'HUBSPOT', shop: undefined })
  })
})

describe('IntegrationsPage: disconnecting a CONNECTED integration', () => {
  beforeEach(() => {
    mocks.disconnect.mockClear()
    mocks.integration.status = 'CONNECTED'
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows a Disconnect button alongside Sync now, and it calls the disconnect mutation after confirming', async () => {
    show()
    expect(screen.getByRole('button', { name: /Sync now|Continue sync/ })).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Disconnect' })
    fireEvent.click(button)
    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.disconnect).toHaveBeenCalledWith('int-1')
  })
})

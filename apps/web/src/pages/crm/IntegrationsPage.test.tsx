import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IntegrationsPage } from './IntegrationsPage'

// Regression coverage for the 2026-09-13 fix: a CrmOAuthService.start() call creates the
// Integration row as INCOMPLETE before the OAuth redirect even happens, and the row only ever
// flips to CONNECTED on a successful callback. Any interruption (cancelled consent, expired
// state, closed tab) previously left the row stuck INCOMPLETE with the action area rendering
// null forever — no button, no error, no way back. The fix adds a Reconnect action for any
// existing non-CONNECTED row on an OAuth-configured provider.
const mocks = vi.hoisted(() => ({
  startOAuth: vi
    .fn()
    .mockResolvedValue({ data: { url: 'https://app.hubspot.com/oauth/authorize?x=1' } }),
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
    data: {
      pages: [
        {
          data: [
            {
              id: 'int-1',
              provider: 'HUBSPOT',
              status: 'INCOMPLETE',
              lastSyncAt: null,
            },
          ],
        },
      ],
    },
  }),
  useCreateIntegration: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartCrmOAuth: () => ({ mutateAsync: mocks.startOAuth, isPending: false }),
  useSyncIntegration: () => ({ mutate: vi.fn(), isPending: false }),
  usePreviewIntegration: () => ({ mutateAsync: vi.fn(), data: undefined }),
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

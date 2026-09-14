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
})

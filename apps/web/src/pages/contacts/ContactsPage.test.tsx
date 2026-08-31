import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useContacts,
  useCreateIntegration,
  useCrmCatalog,
  useDisconnectIntegration,
  useHomeSummary,
  useImportContacts,
  useIntegrations,
  useStartCrmOAuth,
  useSyncIntegration,
  useUpdateIntegration,
} from '@project/sdk'
import { ContactsPage } from './ContactsPage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useContacts: vi.fn(),
  useCreateIntegration: vi.fn(),
  useCrmCatalog: vi.fn(),
  useDisconnectIntegration: vi.fn(),
  useHomeSummary: vi.fn(),
  useImportContacts: vi.fn(),
  useIntegrations: vi.fn(),
  useStartCrmOAuth: vi.fn(),
  useSyncIntegration: vi.fn(),
  useUpdateIntegration: vi.fn(),
}))

describe('ContactsPage', () => {
  it('renders contact provenance and sends the source filter to the API hook', async () => {
    const user = userEvent.setup()
    // ContactsPage now embeds the shared WelcomeSection (docs/strategy/03-product-principles.md's
    // 2026-08-30 nav revision) — isLoading: true keeps it on its own skeleton without needing a
    // full HomeSummary fixture, which isn't what this test is about.
    vi.mocked(useHomeSummary).mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHomeSummary>)
    vi.mocked(useCrmCatalog).mockReturnValue({
      data: { data: [], unresolvedMatchCount: 0 },
    } as unknown as ReturnType<typeof useCrmCatalog>)
    vi.mocked(useImportContacts).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useImportContacts>)
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useIntegrations>)
    vi.mocked(useCreateIntegration).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useCreateIntegration>)
    vi.mocked(useStartCrmOAuth).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useStartCrmOAuth>)
    vi.mocked(useSyncIntegration).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useSyncIntegration>)
    vi.mocked(useUpdateIntegration).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useUpdateIntegration>)
    vi.mocked(useDisconnectIntegration).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDisconnectIntegration>)
    vi.mocked(useContacts).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'contact-1',
                name: 'Real API contact',
                email: 'real@example.com',
                source: 'HUBSPOT',
                createdAt: '2026-08-20T12:00:00.000Z',
              },
            ],
          },
        ],
      },
      hasNextPage: false,
    } as ReturnType<typeof useContacts>)

    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Real API contact')).toBeInTheDocument()
    expect(screen.getAllByText('Hubspot')).toHaveLength(2)
    expect(screen.getByLabelText('Added Aug 20')).toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter contacts by source' }),
      'HUBSPOT',
    )
    expect(useContacts).toHaveBeenLastCalledWith({ source: 'HUBSPOT' })
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })
})

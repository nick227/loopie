import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useContacts,
  useContactTags,
  useCrmCatalog,
  useHomeSummary,
  useImportContacts,
  useIntegrations,
  useLeadQueue,
} from '@project/sdk'
import { ContactsPage } from './ContactsPage'

// Regression coverage for the 2026-09-14 /connections consolidation: Contacts no longer owns a
// second, duplicate CRM connect/disconnect/sync surface (the old ConnectIntegrationsButton modal)
// — it only consumes connected-provider state (an obvious link to /connections, and a contextual
// shortcut straight into Google Sheets' source picker when that's already connected).
vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useContacts: vi.fn(),
  useContactTags: vi.fn(),
  useCrmCatalog: vi.fn(),
  useHomeSummary: vi.fn(),
  useImportContacts: vi.fn(),
  useIntegrations: vi.fn(),
  useLeadQueue: vi.fn(),
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
    vi.mocked(useContactTags).mockReturnValue({
      data: { data: [] },
    } as unknown as ReturnType<typeof useContactTags>)
    vi.mocked(useLeadQueue).mockReturnValue({
      isLoading: false,
      data: { data: [] },
    } as unknown as ReturnType<typeof useLeadQueue>)
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
                records: [
                  {
                    id: 'record-1',
                    provider: 'HUBSPOT',
                    externalId: 'hs-1',
                    matchStatus: 'MATCHED',
                  },
                ],
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
    // Not toHaveBeenLastCalledWith: ContactsCollectionInsights (rendered alongside the list) has
    // its own, later useContacts() call with no args, so the "last call" on this shared mock
    // belongs to it, not to the filtered list query below it.
    expect(useContacts).toHaveBeenCalledWith({ source: 'HUBSPOT' })
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })

  it('always links to /connections, and shortcuts straight into Google Sheets sources once connected — no separate connect/disconnect modal', () => {
    vi.mocked(useHomeSummary).mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHomeSummary>)
    vi.mocked(useImportContacts).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useImportContacts>)
    vi.mocked(useContactTags).mockReturnValue({
      data: { data: [] },
    } as unknown as ReturnType<typeof useContactTags>)
    vi.mocked(useLeadQueue).mockReturnValue({
      isLoading: false,
      data: { data: [] },
    } as unknown as ReturnType<typeof useLeadQueue>)
    vi.mocked(useContacts).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pages: [{ data: [] }] },
      hasNextPage: false,
    } as unknown as ReturnType<typeof useContacts>)
    vi.mocked(useCrmCatalog).mockReturnValue({
      data: { data: [], unresolvedMatchCount: 0 },
    } as unknown as ReturnType<typeof useCrmCatalog>)
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          {
            data: [{ id: 'gs-1', provider: 'GOOGLE_SHEETS', status: 'CONNECTED' }],
          },
        ],
      },
    } as unknown as ReturnType<typeof useIntegrations>)

    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>,
    )

    // Obvious one-click path to the actual provider-management surface — no hunting. Two links
    // point there: the CrmNav sub-nav tab, and the ConnectionsPrompt shortcut in the page header.
    const connectionsLinks = screen.getAllByRole('link', { name: 'Connections' })
    expect(connectionsLinks.length).toBeGreaterThanOrEqual(2)
    connectionsLinks.forEach((link) => expect(link).toHaveAttribute('href', '/connections'))
    // Contextual shortcut into the existing sources screen, not a new connect path.
    expect(screen.getByRole('link', { name: /Import from Google Sheets/ })).toHaveAttribute(
      'href',
      '/integrations/gs-1/google-sheets',
    )
    // No modal-based connect/manage/disconnect surface anywhere on this page anymore.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Manage$/ })).not.toBeInTheDocument()
  })
})

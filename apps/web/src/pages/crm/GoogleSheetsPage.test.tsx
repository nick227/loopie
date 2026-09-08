import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleSheetsPage } from './GoogleSheetsPage'

const mocks = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@project/sdk', () => ({
  useIntegration: () => ({
    data: {
      data: {
        id: 'gs',
        provider: 'GOOGLE_SHEETS',
        status: 'CONNECTED',
        externalAccountId: 'owner@example.com',
      },
    },
  }),
  useImportSources: () => ({
    isLoading: false,
    isSuccess: true,
    data: {
      data: [
        {
          id: 'src-1',
          label: 'My Contacts',
          spreadsheetName: 'CRM Sheet',
          sheetTab: 'Contacts',
          lastRunAt: null,
          needsReview: false,
          running: false,
        },
        {
          id: 'src-2',
          label: 'Old Leads',
          spreadsheetName: 'CRM Sheet',
          sheetTab: 'Leads',
          lastRunAt: '2026-01-01T00:00:00.000Z',
          needsReview: true,
          running: false,
        },
      ],
    },
  }),
  useCreateImportSource: () => ({ mutateAsync: mocks.create, isPending: false }),
  useImportSourceTabs: () => ({
    data: { data: [{ sheetId: 0, title: 'Contacts' }] },
    isFetching: false,
  }),
}))
vi.mock('@/components/crm/GoogleSheetPicker', () => ({
  GoogleSheetPicker: ({ onPicked }: { onPicked: (file: { id: string; name: string }) => void }) => (
    <button onClick={() => onPicked({ id: 'sheet-9', name: 'Another Sheet' })}>
      Choose a spreadsheet
    </button>
  ),
}))

function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/integrations/gs/google-sheets']}>
        <Routes>
          <Route path="/integrations/:integrationId/google-sheets" element={<GoogleSheetsPage />} />
          <Route
            path="/integrations/:integrationId/google-sheets/sources/:sourceId"
            element={<p>arrived at source page</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ data: { id: 'src-new' } })
})

describe('Google Sheets account — saved sources', () => {
  it('lists saved sources and flags the one that needs review', () => {
    show()
    expect(screen.getByText('My Contacts')).toBeInTheDocument()
    expect(screen.getByText('Old Leads')).toBeInTheDocument()
    expect(screen.getByText('Needs review')).toBeInTheDocument()
  })

  it('picks a spreadsheet, selects a tab, saves a new source, and navigates to it', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Choose a spreadsheet' }))
    expect(await screen.findByText('Another Sheet')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Worksheet tab'), { target: { value: 'Contacts' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save source' }))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        integrationId: 'gs',
        spreadsheetId: 'sheet-9',
        sheetTab: 'Contacts',
      }),
    )
    expect(await screen.findByText('arrived at source page')).toBeInTheDocument()
  })
})

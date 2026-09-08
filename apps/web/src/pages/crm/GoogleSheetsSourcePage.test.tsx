import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleSheetsSourcePage } from './GoogleSheetsSourcePage'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), confirm: vi.fn(), sync: vi.fn() }))
vi.mock('@project/sdk', () => ({
  useImportSource: () => ({
    isLoading: false,
    data: {
      data: {
        id: 'src-1',
        integrationId: 'gs',
        label: 'My Contacts',
        spreadsheetName: 'CRM Sheet',
        sheetTab: 'Contacts',
      },
    },
  }),
  usePreviewImportSource: () => ({ mutateAsync: mocks.preview }),
  useConfirmImportSourceMapping: () => ({ mutateAsync: mocks.confirm }),
  useSyncImportSource: () => ({ mutateAsync: mocks.sync, reset: vi.fn() }),
  useImportSourceRuns: () => ({ data: { data: { runs: [], nextCursor: null } } }),
}))

function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/integrations/gs/google-sheets/sources/src-1']}>
        <Routes>
          <Route
            path="/integrations/:integrationId/google-sheets/sources/:sourceId"
            element={<GoogleSheetsSourcePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.preview.mockResolvedValue({
    data: {
      matrix: {
        headers: ['first_name', 'Email'],
        rows: [['Ada', 'ada@example.com']],
        firstDataRow: 2,
        truncated: false,
      },
      mapping: { firstName: 0, email: 1 },
      schemaFingerprint: 'fp-1',
      schemaDrift: false,
      needsReview: false,
      scanned: 1,
      eligible: 1,
      skipped: 0,
    },
  })
  mocks.confirm.mockResolvedValue({ data: {} })
  mocks.sync.mockResolvedValue({ data: { created: 1, matched: 0, hasMore: false } })
})

describe('Google Sheets source review', () => {
  it('shows source values and only imports after review, saving mapping before sync', async () => {
    show()
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Confirm and import' })
    expect(button).toBeDisabled()
    expect(mocks.sync).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(button)
    await waitFor(() =>
      expect(mocks.sync).toHaveBeenCalledWith({ integrationId: 'gs', sourceId: 'src-1' }),
    )
    expect(mocks.confirm).toHaveBeenCalledWith({
      integrationId: 'gs',
      sourceId: 'src-1',
      mapping: { firstName: 0, email: 1 },
      schemaFingerprint: 'fp-1',
    })
    expect(mocks.confirm.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sync.mock.invocationCallOrder[0]!,
    )
  })

  it('requires a new review when the column mapping changes', async () => {
    show()
    await screen.findByText('ada@example.com')
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: '' } })
    await waitFor(() =>
      expect(mocks.preview).toHaveBeenCalledWith({
        integrationId: 'gs',
        sourceId: 'src-1',
        mapping: { email: 1 },
      }),
    )
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Confirm and import' })).toBeDisabled()
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('does not sync after a failed mapping confirmation', async () => {
    mocks.confirm.mockRejectedValue(new Error('Sheet access expired'))
    show()
    await screen.findByText('ada@example.com')
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and import' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sheet access expired')
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('shows a banner and blocks import when the schema has drifted', async () => {
    mocks.preview.mockResolvedValue({
      data: {
        matrix: {
          headers: ['Full Name', 'Email Address'],
          rows: [['Ada', 'ada@example.com']],
          firstDataRow: 2,
          truncated: false,
        },
        mapping: { name: 0, email: 1 },
        schemaFingerprint: 'fp-2',
        schemaDrift: true,
        needsReview: true,
        scanned: 1,
        eligible: 1,
        skipped: 0,
      },
    })
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent(/headings changed/i)
  })
})

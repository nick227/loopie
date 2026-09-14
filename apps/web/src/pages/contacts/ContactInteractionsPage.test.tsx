import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ContactInteractionsPage } from './ContactInteractionsPage'

// Regression coverage for the 2026-09-14 fix: this page was a generator stub
// (`JSON.stringify(item, null, 2)`); now a real timeline reusing InteractionRow, the same
// component ContactPage.tsx's own inline interaction list already uses.
const mocks = vi.hoisted(() => ({
  interactions: [] as unknown[],
}))

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useContact: () => ({ isLoading: false, data: { data: { id: 'c-1', name: 'Alice Smith' } } }),
  useContactInteractions: vi.fn(() => ({ isLoading: false, data: { data: mocks.interactions } })),
}))

function show() {
  render(
    <MemoryRouter initialEntries={['/contacts/c-1/interactions']}>
      <Routes>
        <Route path="/contacts/:contactId/interactions" element={<ContactInteractionsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ContactInteractionsPage: real timeline, not a JSON dump', () => {
  it('renders real interaction rows with no raw JSON', () => {
    mocks.interactions = [
      {
        id: 'int-1',
        type: 'EMAIL_SENT',
        occurredAt: '2026-09-01T00:00:00.000Z',
        metadata: null,
        provider: null,
      },
    ]
    show()
    expect(screen.getByRole('heading', { name: 'Interactions' })).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Email sent')).toBeInTheDocument()
    expect(screen.queryByText(/"type":\s*"EMAIL_SENT"/)).not.toBeInTheDocument()
  })

  it('shows an empty state instead of a bare JSON null when there are no interactions yet', () => {
    mocks.interactions = []
    show()
    expect(screen.getByText('No interactions yet')).toBeInTheDocument()
  })
})

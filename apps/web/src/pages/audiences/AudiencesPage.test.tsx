import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAudiences, useCreateAudience, useCrmCatalog } from '@project/sdk'
import { AudiencesPage } from './AudiencesPage'

// Regression coverage for the 2026-09-14 IA fix: Audiences' detail page was reachable (linked
// from a message's audience name) but the list page had no inbound link from anywhere — an IA
// bug, not an intentional orphan (AudiencesPage.tsx was already a real, fully-built page). Now
// reachable via CrmNav alongside Contacts/Leads/Connections.
vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useAudiences: vi.fn(),
  useCreateAudience: vi.fn(),
  useCrmCatalog: vi.fn(),
}))

describe('AudiencesPage', () => {
  it('mounts CrmNav so Audiences is reachable alongside Contacts/Leads/Connections', () => {
    vi.mocked(useAudiences).mockReturnValue({
      isLoading: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useAudiences>)
    vi.mocked(useCreateAudience).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateAudience>)
    vi.mocked(useCrmCatalog).mockReturnValue({
      data: { data: [], unresolvedMatchCount: 0 },
    } as unknown as ReturnType<typeof useCrmCatalog>)

    render(
      <MemoryRouter initialEntries={['/audiences']}>
        <AudiencesPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Audiences' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contacts' })).toHaveAttribute('href', '/contacts')
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveAttribute('href', '/leads')
    expect(screen.getByRole('link', { name: 'Audiences' })).toHaveAttribute('href', '/audiences')
    expect(screen.getByRole('link', { name: 'Connections' })).toHaveAttribute(
      'href',
      '/connections',
    )
  })
})

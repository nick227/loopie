import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useContacts } from '@project/sdk'
import { ContactsPage } from './ContactsPage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useContacts: vi.fn(),
}))

describe('ContactsPage', () => {
  it('renders contacts returned by the API hook', () => {
    vi.mocked(useContacts).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        pages: [
          { data: [{ id: 'contact-1', name: 'Real API contact', email: 'real@example.com' }] },
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
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })
})

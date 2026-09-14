import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useTemplates } from '@project/sdk'
import { TemplatesPage } from './TemplatesPage'

// Regression coverage for the 2026-09-14 IA cleanup: Templates was a real feature
// (create/update already worked) whose list/detail pages were still generator
// JSON.stringify stubs, and had no inbound link from anywhere. Now reachable from Messages'
// secondary action and rendered as a real list.
vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useTemplates: vi.fn(),
}))

describe('TemplatesPage: real list, not a JSON dump', () => {
  it('renders real template rows with no raw JSON', () => {
    vi.mocked(useTemplates).mockReturnValue({
      isLoading: false,
      hasNextPage: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'tpl-1',
                name: 'Appointment reminder',
                channel: 'EMAIL',
                subject: 'See you soon',
                body: 'Just a reminder about your appointment.',
                purpose: 'Reminder',
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useTemplates>)

    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Appointment reminder/ })).toHaveAttribute(
      'href',
      '/templates/tpl-1',
    )
    expect(screen.getByText('See you soon')).toBeInTheDocument()
    expect(screen.queryByText(/"id":\s*"tpl-1"/)).not.toBeInTheDocument()
  })

  it('shows an honest empty state when there are no templates yet', () => {
    vi.mocked(useTemplates).mockReturnValue({
      isLoading: false,
      hasNextPage: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useTemplates>)

    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('No templates yet')).toBeInTheDocument()
  })
})

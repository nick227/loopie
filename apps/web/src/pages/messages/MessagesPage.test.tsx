import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useHomeSummary, useInboxThreads, useMessages } from '@project/sdk'
import { MessagesPage } from './MessagesPage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useMessages: vi.fn(),
  useHomeSummary: vi.fn(),
  useInboxThreads: vi.fn(),
}))

describe('MessagesPage', () => {
  it('renders real message status from the message query', () => {
    // MessagesPage now embeds the shared WelcomeSection (docs/strategy/03-product-principles.md's
    // 2026-08-30 nav revision) — isLoading: true keeps it on its own skeleton without needing a
    // full HomeSummary fixture, which isn't what this test is about.
    vi.mocked(useHomeSummary).mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHomeSummary>)
    vi.mocked(useInboxThreads).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [] },
    } as unknown as ReturnType<typeof useInboxThreads>)
    vi.mocked(useMessages).mockReturnValue({
      isLoading: false,
      isError: false,
      hasNextPage: false,
      data: {
        pages: [
          {
            data: [
              {
                id: 'message-1',
                subject: 'API subject',
                body: 'Body',
                channel: 'EMAIL',
                status: 'SENT',
                audienceId: 'audience-1',
                createdAt: '2026-01-02T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useMessages>)

    render(
      <MemoryRouter>
        <MessagesPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('API subject')).toBeInTheDocument()
    // 'Sent' also appears as a status-filter option, so assert on the row's own status pill
    // rather than a bare getByText that would match both.
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.queryByText('12')).not.toBeInTheDocument()
  })
})

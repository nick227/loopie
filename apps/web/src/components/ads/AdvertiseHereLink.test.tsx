import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createApiClient } from '@project/sdk'
import { AdvertiseHereLink } from './AdvertiseHereLink'

function mount() {
  createApiClient({ baseUrl: 'http://localhost:3001' })
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <AdvertiseHereLink />
    </QueryClientProvider>,
  )
}

describe('AdvertiseHereLink', () => {
  it('prefills account details and confirms a stored inquiry', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const request = input as Request
      if (request.url.endsWith('/auth/me'))
        return new Response(
          JSON.stringify({ data: { email: 'ada@example.com', businessName: 'Ada Studio' } }),
          { status: 200 },
        )
      expect(await request.json()).toMatchObject({
        name: 'Ada Studio',
        email: 'ada@example.com',
        message: 'Interested in advertising!',
      })
      return new Response(JSON.stringify({ received: true }), { status: 201 })
    })
    mount()
    // Allow the current-user query to populate before opening the form.
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole('button', { name: 'Advertise here' }))
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Studio')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('We’ve received your message')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fetcher.mockRestore()
  })

  it('allows anonymous inquiries and retains the draft and key for a failed request retry', async () => {
    const submissions: Record<string, string>[] = []
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const request = input as Request
      if (request.url.endsWith('/auth/me')) return new Response('{}', { status: 401 })
      submissions.push(await request.json())
      return new Response(
        JSON.stringify(submissions.length === 1 ? { error: 'Unavailable' } : { received: true }),
        { status: submissions.length === 1 ? 503 : 201 },
      )
    })
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Advertise here' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again')
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('We’ve received your message')
    expect(submissions[0]?.submissionKey).toBe(submissions[1]?.submissionKey)
    fetcher.mockRestore()
  })
})

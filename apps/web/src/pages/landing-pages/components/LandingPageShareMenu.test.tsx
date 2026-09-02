import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { LandingPageShareMenu } from './LandingPageShareMenu'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('LandingPageShareMenu', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('explains why published-page actions are unavailable for a draft', () => {
    render(
      <LandingPageShareMenu
        hostedUrl="https://example.test/p/demo"
        published={false}
        onEmbed={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Share/ }))

    expect(screen.getByRole('button', { name: 'Open live page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy live URL' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Embed code' })).toBeDisabled()
    expect(screen.getByText('Publish this page to enable sharing.')).toBeInTheDocument()
  })

  it('opens the live page and launches the embed flow for a published page', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const onEmbed = vi.fn()
    render(
      <LandingPageShareMenu hostedUrl="https://example.test/p/demo" published onEmbed={onEmbed} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Share/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open live page' }))
    expect(open).toHaveBeenCalledWith(
      'https://example.test/p/demo',
      '_blank',
      'noopener,noreferrer',
    )

    fireEvent.click(screen.getByRole('button', { name: /Share/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Embed code' }))
    expect(onEmbed).toHaveBeenCalledOnce()
  })

  it('copies the live URL', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    render(
      <LandingPageShareMenu hostedUrl="https://example.test/p/demo" published onEmbed={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: /Share/ }))
    await user.click(screen.getByRole('button', { name: 'Copy live URL' }))

    expect(writeText).toHaveBeenCalledWith('https://example.test/p/demo')
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Live page link copied'))
  })
})

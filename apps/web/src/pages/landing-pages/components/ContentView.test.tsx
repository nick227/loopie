import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentView } from './ContentView'

vi.mock('@project/sdk', () => ({
  useAsset: vi.fn(() => ({ data: undefined })),
  useCreateAsset: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}))

describe('ContentView browser settings', () => {
  it('shows title and favicon for a layout with no content sections', () => {
    const onBrowserSettings = vi.fn()

    render(
      <ContentView
        content={{ browser: { title: 'Public title', favicon: { url: '/favicon.png' } } }}
        sections={[]}
        layoutConfig={{}}
        onBrowserSettings={onBrowserSettings}
        onSlot={vi.fn()}
        onLayoutConfig={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Page title')).toHaveValue('Public title')
    expect(screen.getByRole('img', { name: 'Current favicon' })).toHaveAttribute(
      'src',
      '/favicon.png',
    )
    expect(screen.getByRole('button', { name: /choose from media/i })).toBeVisible()

    fireEvent.change(screen.getByLabelText('Page title'), {
      target: { value: 'Updated public title' },
    })
    expect(onBrowserSettings).toHaveBeenCalledWith({
      title: 'Updated public title',
      favicon: { url: '/favicon.png' },
    })
  })
})

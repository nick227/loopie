import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentView } from './ContentView'

describe('ContentView browser settings', () => {
  it('shows title and favicon for a layout with no content sections', () => {
    const onBrowserSettings = vi.fn()

    render(
      <ContentView
        content={{ browser: { title: 'Public title', faviconUrl: '/favicon.png' } }}
        sections={[]}
        layoutConfig={{}}
        onBrowserSettings={onBrowserSettings}
        onSlot={vi.fn()}
        onLayoutConfig={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Page title')).toHaveValue('Public title')
    expect(screen.getByLabelText('Favicon URL')).toHaveValue('/favicon.png')

    fireEvent.change(screen.getByLabelText('Page title'), {
      target: { value: 'Updated public title' },
    })
    expect(onBrowserSettings).toHaveBeenCalledWith({
      title: 'Updated public title',
      faviconUrl: '/favicon.png',
    })
  })
})

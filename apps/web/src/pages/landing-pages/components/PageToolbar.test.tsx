import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PageToolbar } from './PageToolbar'

describe('PageToolbar', () => {
  it('keeps layout and style visible as separate compact controls, no modal', () => {
    const onLayoutVariant = vi.fn()
    const onTheme = vi.fn()

    render(
      <PageToolbar
        layoutVariant="STACKED"
        theme={{
          primaryColor: '#FF2D6A',
          backgroundColor: '#FFFFFF',
          fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
          headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
          radius: '9999px',
        }}
        onLayoutVariant={onLayoutVariant}
        onTheme={onTheme}
      />,
    )

    expect(screen.getByText('Stacked')).toBeInTheDocument()
    // The current theme matches the Carbon bundle exactly — shown as a quick label, not a raw select.
    expect(screen.getByText('Carbon')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Style/ }))
    fireEvent.click(screen.getByText('Shopfront'))
    expect(onTheme).toHaveBeenCalledWith(expect.objectContaining({ primaryColor: '#111111' }))
  })

  it('opens the Layout picker as an inline popover, not a modal, and selects immediately', () => {
    const onLayoutVariant = vi.fn()

    render(
      <PageToolbar
        layoutVariant="STACKED"
        theme={{ presetId: 'carbon', primaryColor: '#FF2D6A' }}
        onLayoutVariant={onLayoutVariant}
        onTheme={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Layout/ }))
    // A popover listbox, never a dialog — no "Switch layout"/"Convert page type" modal chrome.
    expect(screen.getByRole('listbox', { name: 'Layout' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Split')).toBeInTheDocument()
    expect(screen.getByText('Centered')).toBeInTheDocument()
    expect(screen.getByText('Alternating')).toBeInTheDocument()
    expect(screen.getByText('Editorial')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Split'))
    expect(onLayoutVariant).toHaveBeenCalledWith('SPLIT')
    expect(screen.queryByRole('listbox', { name: 'Layout' })).not.toBeInTheDocument()
  })
})

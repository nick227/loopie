import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  it('gives a full modal a labelled close control and closes from its backdrop', async () => {
    const onClose = vi.fn()

    render(
      <Modal title="Media library" size="full" onClose={onClose}>
        <p>Library content</p>
      </Modal>,
    )

    expect(screen.getByRole('button', { name: /^Close$/ })).toHaveTextContent('Close')

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

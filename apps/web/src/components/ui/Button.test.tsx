import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies destructive variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByText('Delete')
    expect(button).toHaveClass('bg-destructive')
  })

  it('shows a spinner and disables button when loading', () => {
    render(<Button loading>Submit</Button>)

    // The button should be disabled
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    // The spinner should be rendered (we check for the spinner SVG class or wait for role)
    // Based on standard Lucide spinner implementation in Spinner.tsx
    expect(button.querySelector('svg')).toBeInTheDocument()
    // The text shouldn't be there when loading
    expect(screen.queryByText('Submit')).not.toBeInTheDocument()
  })
})

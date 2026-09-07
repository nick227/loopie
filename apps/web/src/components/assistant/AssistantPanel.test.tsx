import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssistantPanel } from './AssistantPanel'

const state = vi.hoisted(() => ({ data: {} as any }))
vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNextAction: () => ({ data: state.data, isLoading: false, isError: false }),
}))
vi.mock('./steps/AssistantLogoStep', () => ({
  AssistantLogoStep: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Save test logo</button>
  ),
}))
afterEach(cleanup)

function show(actions: any[]) {
  state.data = { action: actions[0], actions, conversation: null }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AssistantPanel open onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const actions = [
  { type: 'BUSINESS_PROFILE', actionId: 'business_info', fields: [] },
  { type: 'BUSINESS_PROFILE', actionId: 'business_logo' },
  { type: 'PAGE', actionId: 'homepage_create' },
]

describe('AssistantPanel', () => {
  it('welcomes the user and opens the selected second action, then returns to the list', () => {
    show(actions)
    expect(screen.getByText('Welcome to Loopie')).toBeTruthy()
    expect(
      screen.getByText(
        /One place to connect your ads, websites, messaging, and users under one CRM/,
      ),
    ).toBeTruthy()
    expect(screen.getAllByTestId('assistant-action')).toHaveLength(3)
    fireEvent.click(screen.getByText('Add your logo'))
    expect(screen.getByText('Do you have a logo you’d like to use?')).toBeTruthy()
    fireEvent.click(screen.getByText('Save test logo'))
    expect(screen.getByText('Welcome to Loopie')).toBeTruthy()
    expect(screen.getByText('Logo added')).toBeTruthy()
  })

  it('shows a single available action without filler', () => {
    show(actions.slice(0, 1))
    expect(screen.getAllByTestId('assistant-action')).toHaveLength(1)
    expect(screen.getByText('Next action')).toBeTruthy()
  })
})

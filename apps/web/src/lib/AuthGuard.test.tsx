import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, useCurrentUser } from '@project/sdk'
import { AuthGuard } from './AuthGuard'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useCurrentUser: vi.fn(),
}))

describe('AuthGuard', () => {
  it('shows a retry state instead of redirecting on a server error', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      isLoading: false,
      isError: true,
      error: new ApiError(500, 'Internal detail'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCurrentUser>)
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/private" element={<p>Private</p>} />
          </Route>
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Account status unavailable' })).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
    expect(screen.queryByText('Internal detail')).not.toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthContext, type AuthState } from '../context/AuthContext'

function renderWith(state: Partial<AuthState>) {
  const value: AuthState = {
    loading: false,
    email: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...state,
  }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/employees']}>
        <Routes>
          <Route path="/signin" element={<div>sign-in page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/employees" element={<div>secret</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /signin', () => {
    renderWith({ email: null })
    expect(screen.getByText('sign-in page')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('renders the page for signed-in users', () => {
    renderWith({ email: 'a@b.com' })
    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})

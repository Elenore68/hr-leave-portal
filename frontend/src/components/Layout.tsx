import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'

export function initials(email: string | null): string {
  if (!email) return '?'
  const name = email.split('@')[0] ?? ''
  const parts = name.split(/[._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return (letters || '?').toUpperCase()
}

const NAV = [
  { to: '/employees', label: 'Employees', testId: 'nav-employees' },
  { to: '/leave', label: 'Leave', testId: 'nav-leave' },
  { to: '/hr-requests', label: 'HR Requests', testId: 'nav-hr-requests' },
  { to: '/assistant', label: 'Assistant', testId: 'nav-assistant' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive ? 'bg-primary text-white shadow-glow' : 'text-secondary hover:bg-lavender'
  }`

export function Layout() {
  const { email, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = () => {
    signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-lavender/60 to-surface">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
          aria-label="Main"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-gold shadow-glow">
              HR
            </span>
            <span className="font-semibold text-primary">Leave Portal</span>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkClass} data-testid={n.testId}>
                {n.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-xs font-semibold text-ink"
              title={email ?? ''}
              aria-hidden="true"
            >
              {initials(email)}
            </span>
            <span className="max-w-[12rem] truncate text-sm text-secondary">{email}</span>
            <Button variant="secondary" onClick={handleSignOut} data-testid="sign-out">
              Sign out
            </Button>
          </div>

          <button
            type="button"
            className="rounded-full p-2 text-primary hover:bg-lavender md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            data-testid="menu-toggle"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              {open ? '✕' : '☰'}
            </span>
          </button>
        </nav>

        {open && (
          <div id="mobile-menu" className="space-y-2 border-t border-white/60 px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={(s) => `block ${linkClass(s)}`} onClick={() => setOpen(false)}>
                {n.label}
              </NavLink>
            ))}
            <p className="truncate px-4 text-xs text-secondary">{email}</p>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

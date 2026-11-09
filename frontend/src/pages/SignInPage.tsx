import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function SignInPage() {
  const { email: signedIn, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/employees'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (signedIn) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl shadow-glow md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-primary/80 p-10 text-white md:flex">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold font-semibold text-ink">
            HR
          </span>
          <div>
            <h1 className="text-3xl font-semibold leading-tight">
              Leave &amp; people,
              <br />
              <span className="text-gold">made simple.</span>
            </h1>
            <p className="mt-3 text-sm text-white/80">
              Manage employees and ask the HR assistant, all in one place.
            </p>
          </div>
        </div>
        <div className="glass bg-white/90 p-8 md:p-10">
          <h2 className="text-2xl font-semibold text-primary">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-secondary">Sign in with your work email.</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="password"
            />
            <div aria-live="assertive" className="min-h-[1.25rem]">
              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="signin-error">
                  {error}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !email || !password}
              data-testid="signin-submit"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

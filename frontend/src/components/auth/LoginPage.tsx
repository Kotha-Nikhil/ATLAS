import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, setToken } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await login(email, password)
      setToken(res.token)

      const payload = JSON.parse(atob(res.token.split('.')[1]))
      setAuth(res.user, payload.exp * 1000)

      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ed-bg">
      <div className="w-full max-w-sm rounded-lg border border-ed-border bg-ed-surface p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-ed-teal tracking-wide">ATLAS</h1>
          <p className="mt-1 text-xs text-ed-muted">
            Automated Triage & Live Alert System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-ed-red/30 bg-ed-red/10 px-3 py-2 text-xs text-ed-red">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[11px] font-medium uppercase tracking-wider text-ed-muted mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dr.chen@atlas.ed"
              required
              autoFocus
              className="w-full rounded border border-ed-border bg-ed-bg px-3 py-2 text-sm text-ed-text placeholder:text-ed-muted/50 focus:border-ed-teal focus:outline-none focus:ring-1 focus:ring-ed-teal"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-medium uppercase tracking-wider text-ed-muted mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded border border-ed-border bg-ed-bg px-3 py-2 text-sm text-ed-text placeholder:text-ed-muted/50 focus:border-ed-teal focus:outline-none focus:ring-1 focus:ring-ed-teal"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-ed-teal py-2 text-sm font-bold text-white transition-colors hover:bg-ed-teal/80 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="mt-4 rounded border border-ed-border bg-ed-bg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ed-muted mb-2">
              Demo Credentials
            </p>
            <div className="space-y-1 text-[11px] text-ed-muted">
              <p><span className="text-ed-text font-medium">MD:</span> dr.chen@atlas.ed / password123</p>
              <p><span className="text-ed-text font-medium">RN:</span> nurse.k@atlas.ed / password123</p>
              <p><span className="text-ed-text font-medium">CHG:</span> charge.m@atlas.ed / password123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

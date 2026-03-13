import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { refreshToken, setToken, clearToken } from '@/lib/api'

const WARNING_BEFORE_MS = 2 * 60 * 1000

export function SessionTimeoutModal() {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  useEffect(() => {
    if (!tokenExpiresAt) return

    const checkInterval = setInterval(() => {
      const remaining = tokenExpiresAt - Date.now()

      if (remaining <= 0) {
        clearAuth()
        clearToken()
        navigate('/login', { replace: true })
        return
      }

      if (remaining <= WARNING_BEFORE_MS) {
        setShowWarning(true)
        setSecondsLeft(Math.ceil(remaining / 1000))
      }
    }, 1000)

    return () => clearInterval(checkInterval)
  }, [tokenExpiresAt, clearAuth, navigate])

  const handleExtend = useCallback(async () => {
    try {
      const res = await refreshToken()
      setToken(res.token)
      const payload = JSON.parse(atob(res.token.split('.')[1]))
      setAuth(res.user, payload.exp * 1000)
      setShowWarning(false)
    } catch {
      clearAuth()
      clearToken()
      navigate('/login', { replace: true })
    }
  }, [setAuth, clearAuth, navigate])

  const handleLogout = useCallback(() => {
    clearAuth()
    clearToken()
    navigate('/login', { replace: true })
  }, [clearAuth, navigate])

  const extendRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (showWarning) extendRef.current?.focus()
  }, [showWarning])

  if (!showWarning) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleLogout()
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-ed-orange bg-ed-surface p-6 shadow-xl">
        <h2 id="session-timeout-title" className="text-lg font-bold text-ed-orange mb-2">Session Expiring</h2>
        <p className="text-sm text-ed-muted mb-4">
          Your session will expire in <span className="font-bold text-ed-text">{secondsLeft}s</span>.
          For HIPAA compliance, sessions are limited to 15 minutes.
        </p>
        <div className="flex gap-3">
          <button
            ref={extendRef}
            type="button"
            onClick={handleExtend}
            className="flex-1 rounded bg-ed-teal py-2 text-sm font-bold text-white hover:bg-ed-teal/80 transition-colors"
          >
            Extend Session
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 rounded border border-ed-border py-2 text-sm font-medium text-ed-muted hover:bg-ed-surface transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}

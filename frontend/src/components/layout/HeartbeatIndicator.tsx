import { useState, useEffect } from 'react'
import { useAlertStore } from '@/store/alertStore'

export function HeartbeatIndicator() {
  const lastUpdateTime = useAlertStore((s) => s.lastUpdateTime)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdateTime])

  useEffect(() => {
    setFlash(true)
    setSecondsAgo(0)
    const timer = setTimeout(() => setFlash(false), 400)
    return () => clearTimeout(timer)
  }, [lastUpdateTime])

  return (
    <div className="ml-auto flex items-center gap-2" role="status" aria-live="polite">
      <span className="text-[10px] text-ed-muted">
        Last update: {secondsAgo}s ago
      </span>
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          flash ? 'bg-white animate-heartbeat-tick' : 'bg-ed-green animate-pulse'
        }`}
        aria-label="System active"
      />
    </div>
  )
}

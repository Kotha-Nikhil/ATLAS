import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { usePatientStore } from '@/store/patientStore'
import { useAlertStore } from '@/store/alertStore'
import { useAuthStore } from '@/store/authStore'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopRiskCards } from '@/components/command/TopRiskCards'
import { PatientTable } from '@/components/patients/PatientTable'
import { PendingResultsPanel } from '@/components/command/PendingResultsPanel'
import { Top5SickModal } from '@/components/overlays/Top5SickModal'
import { HandoffModal } from '@/components/overlays/HandoffModal'
import { FastDispoPanel } from '@/components/command/FastDispoPanel'
import { AIAssistPanel } from '@/components/command/AIAssistPanel'
import { LoginPage } from '@/components/auth/LoginPage'
import { SessionTimeoutModal } from '@/components/auth/SessionTimeoutModal'

function HeartbeatIndicator() {
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
    <div className="ml-auto flex items-center gap-2">
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Dashboard() {
  useRealtimeEvents()

  const [top5Open, setTop5Open] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [fastDispoOpen, setFastDispoOpen] = useState(false)
  const [aiAssistOpen, setAiAssistOpen] = useState(false)

  const overdueFilter = usePatientStore((s) => s.overdueFilter)
  const setOverdueFilter = usePatientStore((s) => s.setOverdueFilter)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const toggleOverdue = useCallback(() => {
    setOverdueFilter(!overdueFilter)
  }, [overdueFilter, setOverdueFilter])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('atlas_token')
    clearAuth()
    window.location.href = '/login'
  }, [clearAuth])

  return (
    <div className="flex flex-col h-screen bg-ed-bg">
      {/* WORKFLOW ONLY BANNER */}
      <div className="flex items-center justify-between bg-ed-orange/10 border-b border-ed-orange/20 px-4 py-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ed-orange">
          WORKFLOW ONLY · NO AUTO-ORDERS
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded border border-ed-green/30 bg-ed-green/10 px-2 py-0.5 text-[9px] font-bold text-ed-green">
            HIPAA COMPLIANT
          </span>
          <UserBadge />
          <button
            onClick={handleLogout}
            className="text-[10px] text-ed-muted hover:text-ed-text transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <PendingResultsPanel />

      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <TopRiskCards />

          <div className="border-t border-ed-border">
            <PatientTable />
          </div>
        </main>

        <Sidebar />
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center gap-2 border-t border-ed-border bg-ed-surface px-4 py-2">
        <button
          onClick={() => setTop5Open(true)}
          className="rounded border border-ed-red/30 bg-ed-red/10 px-3 py-1.5 text-[11px] font-bold text-ed-red hover:bg-ed-red/20 transition-colors"
        >
          Top 5 Sick
        </button>
        <button
          onClick={() => setFastDispoOpen(true)}
          className="rounded border border-ed-green/30 bg-ed-green/10 px-3 py-1.5 text-[11px] font-bold text-ed-green hover:bg-ed-green/20 transition-colors"
        >
          Fast Dispos
        </button>
        <button
          onClick={toggleOverdue}
          className={`rounded border px-3 py-1.5 text-[11px] font-bold transition-colors ${
            overdueFilter
              ? 'border-ed-orange bg-ed-orange/20 text-ed-orange'
              : 'border-ed-orange/30 bg-ed-orange/10 text-ed-orange hover:bg-ed-orange/20'
          }`}
        >
          {overdueFilter ? 'Show All' : 'Overdue'}
        </button>
        <button
          onClick={() => setHandoffOpen(true)}
          className="rounded border border-ed-teal/30 bg-ed-teal/10 px-3 py-1.5 text-[11px] font-bold text-ed-teal hover:bg-ed-teal/20 transition-colors"
        >
          Handoff
        </button>
        <button
          onClick={() => setAiAssistOpen(true)}
          className="rounded border border-ed-purple/30 bg-ed-purple/10 px-3 py-1.5 text-[11px] font-bold text-ed-purple hover:bg-ed-purple/20 transition-colors"
        >
          AI Assist
        </button>

        <HeartbeatIndicator />
      </div>

      {/* Modals */}
      <Top5SickModal open={top5Open} onOpenChange={setTop5Open} />
      <HandoffModal open={handoffOpen} onOpenChange={setHandoffOpen} />
      <FastDispoPanel open={fastDispoOpen} onOpenChange={setFastDispoOpen} />
      <AIAssistPanel open={aiAssistOpen} onOpenChange={setAiAssistOpen} />
      <SessionTimeoutModal />
    </div>
  )
}

function UserBadge() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  return (
    <span className="text-[10px] text-ed-muted">
      {user.name} <span className="text-ed-teal font-bold">({user.role})</span>
    </span>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

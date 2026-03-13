import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { usePatientStore } from '@/store/patientStore'
import { useAuthStore } from '@/store/authStore'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { UserBadge } from '@/components/layout/UserBadge'
import { ActionBar } from '@/components/layout/ActionBar'
import { TopRiskCards } from '@/components/command/TopRiskCards'
import { PatientTable } from '@/components/patients/PatientTable'
import { PendingResultsPanel } from '@/components/command/PendingResultsPanel'
import { Top5SickModal } from '@/components/overlays/Top5SickModal'
import { HandoffModal } from '@/components/overlays/HandoffModal'
import { FastDispoPanel } from '@/components/command/FastDispoPanel'
import { AIAssistPanel } from '@/components/command/AIAssistPanel'
import { MetricsPanel } from '@/components/command/MetricsPanel'
import { AnalyticsPanel } from '@/components/command/AnalyticsPanel'
import { FHIRImportPanel } from '@/components/command/FHIRImportPanel'
import { LoginPage } from '@/components/auth/LoginPage'
import { SessionTimeoutModal } from '@/components/auth/SessionTimeoutModal'

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
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [fhirOpen, setFhirOpen] = useState(false)

  const overdueFilter = usePatientStore((s) => s.overdueFilter)
  const setOverdueFilter = usePatientStore((s) => s.setOverdueFilter)
  const loading = usePatientStore((s) => s.loading)
  const error = usePatientStore((s) => s.error)
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
      <div className="flex items-center justify-between bg-ed-orange/10 border-b border-ed-orange/20 px-4 py-1" role="banner">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ed-orange">
          WORKFLOW ONLY · NO AUTO-ORDERS
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded border border-ed-green/30 bg-ed-green/10 px-2 py-0.5 text-[9px] font-bold text-ed-green">
            HIPAA COMPLIANT
          </span>
          <UserBadge />
          <button
            type="button"
            onClick={handleLogout}
            className="text-[10px] text-ed-muted hover:text-ed-text transition-colors"
            aria-label="Sign out of ATLAS"
          >
            Sign Out
          </button>
        </div>
      </div>

      <PendingResultsPanel />

      <TopBar />

      {loading ? (
        <div className="flex flex-1 items-center justify-center" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ed-teal border-t-transparent" />
            <span className="text-sm text-ed-muted">Loading patient data...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center" role="alert">
          <div className="flex flex-col items-center gap-3 max-w-sm text-center">
            <span className="text-lg text-ed-red font-bold">Connection Error</span>
            <span className="text-sm text-ed-muted">{error}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 rounded bg-ed-teal px-4 py-2 text-sm font-bold text-white hover:bg-ed-teal/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto" role="main">
            <TopRiskCards />
            <div className="border-t border-ed-border">
              <PatientTable />
            </div>
          </main>
          <Sidebar />
        </div>
      )}

      <ActionBar
        overdueFilter={overdueFilter}
        onToggleOverdue={toggleOverdue}
        onTop5={() => setTop5Open(true)}
        onFastDispo={() => setFastDispoOpen(true)}
        onHandoff={() => setHandoffOpen(true)}
        onAiAssist={() => setAiAssistOpen(true)}
        onMetrics={() => setMetricsOpen(true)}
        onAnalytics={() => setAnalyticsOpen(true)}
        onFhirImport={() => setFhirOpen(true)}
      />

      {/* Modals */}
      <Top5SickModal open={top5Open} onOpenChange={setTop5Open} />
      <HandoffModal open={handoffOpen} onOpenChange={setHandoffOpen} />
      <FastDispoPanel open={fastDispoOpen} onOpenChange={setFastDispoOpen} />
      <AIAssistPanel open={aiAssistOpen} onOpenChange={setAiAssistOpen} />
      <MetricsPanel open={metricsOpen} onOpenChange={setMetricsOpen} />
      <AnalyticsPanel open={analyticsOpen} onOpenChange={setAnalyticsOpen} />
      <FHIRImportPanel open={fhirOpen} onOpenChange={setFhirOpen} />
      <SessionTimeoutModal />
    </div>
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

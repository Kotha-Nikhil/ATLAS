import { useMemo } from 'react'
import type { Patient } from '@/types'
import { VitalsChart } from './VitalsChart'

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-ed-muted mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function PatientDetailPanel({
  patient,
  onClose,
}: {
  patient: Patient
  onClose: () => void
}) {
  const overdueMinutes = useMemo(() => {
    if (!patient.nextMilestone.isOverdue) return 0
    return Math.floor((Date.now() - patient.nextMilestone.dueTime.getTime()) / 60_000)
  }, [patient.nextMilestone])

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-detail-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-ed-bg border-l border-ed-border overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-ed-surface border-b border-ed-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-ed-teal">Bed {patient.bed}</span>
            <span id="patient-detail-title" className="text-sm font-bold text-ed-text">
              {patient.name}
            </span>
            <span className="text-xs text-ed-muted">{patient.age}{patient.sex}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-ed-muted hover:text-ed-text hover:bg-white/5 transition-colors"
            aria-label="Close patient detail"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Clinical Summary */}
          <Section title="Clinical Summary">
            <div className="grid grid-cols-2 gap-2">
              <InfoCard label="ESI" value={String(patient.esi)} color={patient.esi <= 2 ? 'text-ed-red' : 'text-ed-text'} />
              <InfoCard label="Chief Complaint" value={`${patient.chiefComplaintIcon} ${patient.chiefComplaint}`} />
              <InfoCard label="Time In" value={formatTimeAgo(patient.timeIn)} />
              <InfoCard label="Risk Score" value={String(patient.riskScore)} color={patient.riskScore >= 70 ? 'text-ed-red' : patient.riskScore >= 40 ? 'text-ed-orange' : 'text-ed-text'} />
              <InfoCard label="Owner" value={patient.owner} />
              <InfoCard label="Disposition" value={patient.dispositionStatus} />
            </div>

            {patient.sepsisWatch && (
              <div className="mt-2 rounded border border-ed-red/50 bg-ed-red/10 px-3 py-2 text-xs font-bold text-ed-red animate-flash-red">
                SEPSIS WATCH ACTIVE
              </div>
            )}
          </Section>

          {/* Risk Flags */}
          {patient.riskFlags.length > 0 && (
            <Section title={`Risk Flags (${patient.riskFlags.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {patient.riskFlags.map((flag, i) => (
                  <span
                    key={`${flag.label}-${flag.severity}-${i}`}
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                      flag.severity === 'critical'
                        ? 'bg-ed-red/10 text-ed-red border-ed-red/30'
                        : flag.severity === 'high'
                          ? 'bg-ed-orange/10 text-ed-orange border-ed-orange/30'
                          : 'bg-ed-yellow/10 text-ed-yellow border-ed-yellow/30'
                    }`}
                  >
                    {flag.label}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Milestone */}
          <Section title="Next Milestone">
            <div className={`rounded border p-3 ${
              patient.nextMilestone.isOverdue
                ? 'border-ed-red/50 bg-ed-red/5'
                : 'border-ed-border bg-ed-surface'
            }`}>
              <span className="text-xs text-ed-text font-medium block">
                {patient.nextMilestone.description || 'No milestone set'}
              </span>
              {patient.nextMilestone.dueTime && (
                <span className={`text-[10px] mt-1 block ${
                  patient.nextMilestone.isOverdue ? 'text-ed-red font-bold' : 'text-ed-muted'
                }`}>
                  {patient.nextMilestone.isOverdue
                    ? `OVERDUE by ${overdueMinutes}m`
                    : `Due at ${formatTime(patient.nextMilestone.dueTime)}`}
                </span>
              )}
            </div>
          </Section>

          {/* AI Assist */}
          {patient.aiAssist && (
            <Section title="AI Suggestion">
              <div className="rounded border border-ed-teal/30 bg-ed-teal/5 p-3">
                <span className="text-xs text-ed-teal italic">{patient.aiAssist}</span>
              </div>
            </Section>
          )}

          {/* Vitals Trend */}
          <Section title="Vitals Trend (Last 2 Hours)">
            <VitalsChart patient={patient} />
          </Section>

          {/* Labs */}
          <Section title={`Labs (${patient.labs.length})`}>
            {patient.labs.length === 0 ? (
              <span className="text-[11px] text-ed-muted">No labs ordered</span>
            ) : (
              <div className="space-y-1">
                {patient.labs.map((lab) => (
                  <div
                    key={lab.id}
                    className={`flex items-center justify-between rounded px-3 py-2 ${
                      lab.isCritical ? 'bg-ed-red/10 border border-ed-red/30' : 'bg-ed-surface border border-ed-border'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-ed-text">{lab.name}</span>
                      <span className="text-[10px] text-ed-muted block">
                        Ordered {formatTimeAgo(lab.orderedAt)}
                      </span>
                    </div>
                    <div className="text-right">
                      {lab.resultedAt ? (
                        <>
                          <span className={`text-xs font-bold ${lab.isCritical ? 'text-ed-red' : 'text-ed-green'}`}>
                            {lab.value ?? 'Resulted'}
                          </span>
                          {lab.isCritical && (
                            <span className="text-[10px] text-ed-red font-bold block">CRITICAL</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-ed-yellow font-medium">PENDING</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Imaging */}
          <Section title={`Imaging (${patient.imaging.length})`}>
            {patient.imaging.length === 0 ? (
              <span className="text-[11px] text-ed-muted">No imaging orders</span>
            ) : (
              <div className="space-y-1">
                {patient.imaging.map((img) => {
                  const isUnread = img.status === 'complete' || img.status === 'ordered' || img.status === 'in-scanner'
                  return (
                    <div
                      key={img.id}
                      className={`flex items-center justify-between rounded px-3 py-2 ${
                        isUnread ? 'bg-ed-surface border border-ed-border' : 'bg-ed-green/5 border border-ed-green/20'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-ed-text">{img.type}</span>
                        <span className="text-[10px] text-ed-muted block">
                          Ordered {formatTimeAgo(img.orderedAt)}
                        </span>
                      </div>
                      <span className={`text-[10px] font-medium ${
                        img.status === 'read' ? 'text-ed-green'
                          : img.status === 'complete' ? 'text-ed-orange'
                            : 'text-ed-muted'
                      }`}>
                        {img.status.toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Consults */}
          <Section title={`Consults (${patient.consults.length})`}>
            {patient.consults.length === 0 ? (
              <span className="text-[11px] text-ed-muted">No active consults</span>
            ) : (
              <div className="space-y-1">
                {patient.consults.map((consult) => (
                  <div
                    key={consult.id}
                    className="flex items-center justify-between rounded bg-ed-surface border border-ed-border px-3 py-2"
                  >
                    <div>
                      <span className="text-xs font-bold text-ed-text">{consult.specialty}</span>
                      <span className="text-[10px] text-ed-muted block">
                        Called {formatTimeAgo(consult.calledAt)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium ${
                      consult.status === 'seen' ? 'text-ed-green'
                        : consult.status === 'callback-received' ? 'text-ed-teal'
                          : 'text-ed-orange'
                    }`}>
                      {consult.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded bg-ed-surface border border-ed-border px-3 py-2">
      <span className="text-[10px] text-ed-muted block">{label}</span>
      <span className={`text-xs font-bold ${color ?? 'text-ed-text'}`}>{value}</span>
    </div>
  )
}

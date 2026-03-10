import { useRiskScoring } from '@/hooks/useRiskScoring'

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function TopRiskCards() {
  const { topRisk } = useRiskScoring()

  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-3">
      {topRisk.map((patient, index) => {
        const timeAgo = formatTimeAgo(patient.timeIn)
        const isOverdue = patient.nextMilestone.isOverdue
        const riskSummary = patient.riskFlags.map((f) => f.label).join(' · ')

        return (
          <div
            key={patient.id}
            className="rounded-lg border border-ed-border bg-ed-surface p-3"
            role="article"
            aria-label={`Top risk ${index + 1}: ${patient.name}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ed-red">
                TOP RISK #{index + 1}
              </span>
              <span className="text-[10px] text-ed-muted">
                Score: {patient.riskScore}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-ed-text">
                {patient.name}
              </span>
              <span className="text-xs text-ed-teal">
                Bed {patient.bed}
              </span>
            </div>

            <p className="text-xs text-ed-muted mb-2 truncate">
              {riskSummary || patient.chiefComplaint}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ed-muted">
                {patient.chiefComplaintIcon} {patient.chiefComplaint}
              </span>
              <span
                className={`text-[10px] font-mono ${isOverdue ? 'text-ed-red font-bold' : 'text-ed-muted'}`}
              >
                {timeAgo}
                {isOverdue && ' ⚠'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

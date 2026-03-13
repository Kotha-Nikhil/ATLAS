import { HeartbeatIndicator } from './HeartbeatIndicator'

interface ActionBarProps {
  overdueFilter: boolean
  onToggleOverdue: () => void
  onTop5: () => void
  onFastDispo: () => void
  onHandoff: () => void
  onAiAssist: () => void
  onMetrics: () => void
  onAnalytics: () => void
  onFhirImport: () => void
}

export function ActionBar({
  overdueFilter,
  onToggleOverdue,
  onTop5,
  onFastDispo,
  onHandoff,
  onAiAssist,
  onMetrics,
  onAnalytics,
  onFhirImport,
}: ActionBarProps) {
  return (
    <nav className="flex items-center gap-2 border-t border-ed-border bg-ed-surface px-4 py-2" aria-label="Quick actions">
      <button
        type="button"
        onClick={onTop5}
        className="rounded border border-ed-red/30 bg-ed-red/10 px-3 py-1.5 text-[11px] font-bold text-ed-red hover:bg-ed-red/20 transition-colors"
        aria-label="View top 5 sickest patients"
      >
        Top 5 Sick
      </button>
      <button
        type="button"
        onClick={onFastDispo}
        className="rounded border border-ed-green/30 bg-ed-green/10 px-3 py-1.5 text-[11px] font-bold text-ed-green hover:bg-ed-green/20 transition-colors"
        aria-label="View fast disposition candidates"
      >
        Fast Dispos
      </button>
      <button
        type="button"
        onClick={onToggleOverdue}
        className={`rounded border px-3 py-1.5 text-[11px] font-bold transition-colors ${
          overdueFilter
            ? 'border-ed-orange bg-ed-orange/20 text-ed-orange'
            : 'border-ed-orange/30 bg-ed-orange/10 text-ed-orange hover:bg-ed-orange/20'
        }`}
        aria-label={overdueFilter ? 'Show all patients' : 'Filter to overdue milestones only'}
        aria-pressed={overdueFilter}
      >
        {overdueFilter ? 'Show All' : 'Overdue'}
      </button>
      <button
        type="button"
        onClick={onHandoff}
        className="rounded border border-ed-teal/30 bg-ed-teal/10 px-3 py-1.5 text-[11px] font-bold text-ed-teal hover:bg-ed-teal/20 transition-colors"
        aria-label="Generate handoff summary"
      >
        Handoff
      </button>
      <button
        type="button"
        onClick={onAiAssist}
        className="rounded border border-ed-purple/30 bg-ed-purple/10 px-3 py-1.5 text-[11px] font-bold text-ed-purple hover:bg-ed-purple/20 transition-colors"
        aria-label="Open AI assistant"
      >
        AI Assist
      </button>
      <button
        type="button"
        onClick={onMetrics}
        className="rounded border border-ed-blue/30 bg-ed-blue/10 px-3 py-1.5 text-[11px] font-bold text-ed-blue hover:bg-ed-blue/20 transition-colors"
        aria-label="View ED metrics dashboard"
      >
        Metrics
      </button>
      <button
        type="button"
        onClick={onAnalytics}
        className="rounded border border-ed-blue/30 bg-ed-blue/10 px-3 py-1.5 text-[11px] font-bold text-ed-blue hover:bg-ed-blue/20 transition-colors"
        aria-label="View ED analytics"
      >
        Analytics
      </button>
      <button
        type="button"
        onClick={onFhirImport}
        className="rounded border border-ed-teal/30 bg-ed-teal/10 px-3 py-1.5 text-[11px] font-bold text-ed-teal hover:bg-ed-teal/20 transition-colors font-mono"
        aria-label="Import patients from FHIR sandbox"
      >
        FHIR Import
      </button>

      <HeartbeatIndicator />
    </nav>
  )
}

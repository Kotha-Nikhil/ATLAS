import { usePatientStore } from '@/store/patientStore'

function MetricCard({
  label,
  value,
  color = 'text-ed-text',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex flex-col items-center px-4 py-2 border-r border-ed-border last:border-r-0">
      <span className="text-[10px] uppercase tracking-wider text-ed-muted">
        {label}
      </span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  )
}

function getDoorToDocColor(minutes: number): string {
  if (minutes < 30) return 'text-ed-green'
  if (minutes <= 60) return 'text-ed-orange'
  return 'text-ed-red'
}

function getLWBSColor(risk: string): string {
  if (risk === 'LOW') return 'text-ed-green'
  if (risk === 'MED') return 'text-ed-orange'
  return 'text-ed-red'
}

export function TopBar() {
  const metrics = usePatientStore((s) => s.metrics)

  return (
    <div className="flex items-center justify-between border-b border-ed-border bg-ed-surface px-4">
      <div className="flex items-center gap-2 py-2">
        <span className="text-ed-teal font-bold text-sm tracking-wide">
          ED COMMAND CENTER
        </span>
        <span className="text-[10px] text-ed-muted">v1.0</span>
      </div>

      <div className="flex items-center" role="status" aria-label="Dashboard metrics">
        <MetricCard label="Patients IN" value={metrics.patientsIn} />
        <MetricCard
          label="ESI 1-2"
          value={metrics.esi12Count}
          color={metrics.esi12Count > 0 ? 'text-ed-red' : 'text-ed-text'}
        />
        <MetricCard
          label="Waiting"
          value={metrics.waitingCount}
          color={metrics.waitingCount > 5 ? 'text-ed-orange' : 'text-ed-text'}
        />
        <MetricCard label="Pending Dispo" value={metrics.pendingDispoCount} />
        <MetricCard
          label="Door-to-Doc"
          value={`${metrics.doorToDocMinutes}m`}
          color={getDoorToDocColor(metrics.doorToDocMinutes)}
        />
        <MetricCard
          label="LWBS Risk"
          value={metrics.lwbsRisk}
          color={getLWBSColor(metrics.lwbsRisk)}
        />
      </div>
    </div>
  )
}

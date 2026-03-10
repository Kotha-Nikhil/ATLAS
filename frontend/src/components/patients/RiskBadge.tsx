import type { RiskFlag } from '@/types'

const severityStyles: Record<string, string> = {
  critical: 'bg-ed-red/20 text-ed-red border-ed-red/30',
  high: 'bg-ed-orange/20 text-ed-orange border-ed-orange/30',
  watch: 'bg-ed-yellow/20 text-ed-yellow border-ed-yellow/30',
}

export function RiskBadge({ flag }: { flag: RiskFlag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityStyles[flag.severity]}`}
      aria-label={`${flag.severity} risk: ${flag.label}`}
    >
      {flag.label}
    </span>
  )
}

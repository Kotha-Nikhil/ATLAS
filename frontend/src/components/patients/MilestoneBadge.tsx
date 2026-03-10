import type { Milestone } from '@/types'
import { getOverdueUrgency, getUrgencyAnimationClass } from '@/utils/alertAnimations'

function formatDueTime(milestone: Milestone): string {
  if (milestone.isOverdue) {
    const overdueMinutes = Math.floor(
      (Date.now() - milestone.dueTime.getTime()) / 60_000,
    )
    const hours = Math.floor(overdueMinutes / 60)
    const mins = overdueMinutes % 60
    if (hours > 0) return `OVERDUE ${hours}h ${String(mins).padStart(2, '0')}m`
    return `OVERDUE ${mins}m`
  }

  const minutesLeft = Math.floor(
    (milestone.dueTime.getTime() - Date.now()) / 60_000,
  )
  if (minutesLeft <= 0) return 'DUE NOW'
  if (minutesLeft < 60) return `${minutesLeft}m`
  const hours = Math.floor(minutesLeft / 60)
  const mins = minutesLeft % 60
  return `${hours}h ${mins}m`
}

export function MilestoneBadge({ milestone }: { milestone: Milestone }) {
  const timeStr = formatDueTime(milestone)
  const isOverdue = milestone.isOverdue

  let overdueClasses = 'text-ed-teal'
  if (isOverdue) {
    const overdueMinutes = Math.floor(
      (Date.now() - milestone.dueTime.getTime()) / 60_000,
    )
    const urgency = getOverdueUrgency(overdueMinutes)
    overdueClasses = urgency
      ? `text-ed-red ${getUrgencyAnimationClass(urgency)}`
      : 'text-ed-red animate-pulse'
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-ed-text truncate max-w-[180px]">
        {milestone.description}
      </span>
      <span
        className={`text-[10px] font-bold ${overdueClasses}`}
        aria-label={isOverdue ? `Milestone overdue by ${timeStr}` : `Due in ${timeStr}`}
      >
        {isOverdue && '⚠ '}
        {timeStr}
      </span>
    </div>
  )
}

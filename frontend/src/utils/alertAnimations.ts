export type AlertUrgency = 'warning' | 'critical' | 'emergency'

export function getUnreadUrgency(minutesUnread: number): AlertUrgency | null {
  if (minutesUnread >= 60) return 'emergency'
  if (minutesUnread >= 45) return 'critical'
  if (minutesUnread >= 30) return 'warning'
  return null
}

export function getOverdueUrgency(overdueMinutes: number): AlertUrgency | null {
  if (overdueMinutes >= 60) return 'emergency'
  if (overdueMinutes >= 30) return 'critical'
  if (overdueMinutes > 0) return 'warning'
  return null
}

export function getUrgencyAnimationClass(urgency: AlertUrgency): string {
  switch (urgency) {
    case 'warning':
      return 'animate-pulse-amber'
    case 'critical':
      return 'animate-flash-red'
    case 'emergency':
      return 'animate-flash-emergency'
  }
}

export function getUrgencyBorderClass(urgency: AlertUrgency): string {
  switch (urgency) {
    case 'warning':
      return 'border-l-4 border-l-ed-orange'
    case 'critical':
      return 'border-l-4 border-l-ed-red'
    case 'emergency':
      return 'border-l-4 border-l-ed-red shadow-[inset_0_0_12px_rgba(255,68,68,0.3)]'
  }
}

export function getUrgencyBgClass(urgency: AlertUrgency): string {
  switch (urgency) {
    case 'warning':
      return 'bg-ed-orange/5'
    case 'critical':
      return 'bg-ed-red/10'
    case 'emergency':
      return 'bg-ed-red/15'
  }
}

export function getUrgencyTextClass(urgency: AlertUrgency): string {
  switch (urgency) {
    case 'warning':
      return 'text-ed-orange'
    case 'critical':
      return 'text-ed-red'
    case 'emergency':
      return 'text-ed-red font-bold'
  }
}

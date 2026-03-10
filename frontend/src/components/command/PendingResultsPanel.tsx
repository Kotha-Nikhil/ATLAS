import { useAlertStore } from '@/store/alertStore'
import {
  getUrgencyBorderClass,
  getUrgencyBgClass,
  getUrgencyTextClass,
} from '@/utils/alertAnimations'

export function PendingResultsPanel() {
  const alerts = useAlertStore((s) => s.alerts)
  const dismissAlert = useAlertStore((s) => s.dismissAlert)
  if (alerts.length === 0) return null

  return (
    <div
      className="border-b border-ed-border"
      aria-live={alerts.some((a) => a.urgency === 'emergency') ? 'assertive' : 'polite'}
      role="alert"
    >
      {alerts.map((alert) => {
        const borderClass = getUrgencyBorderClass(alert.urgency)
        const bgClass = getUrgencyBgClass(alert.urgency)
        const textClass = getUrgencyTextClass(alert.urgency)

        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-4 py-2 animate-slide-down ${borderClass} ${bgClass}`}
          >
            <span className={`text-[11px] font-bold flex-1 ${textClass}`}>
              {alert.urgency === 'emergency' && '🚨 '}
              {alert.message}
            </span>
            <span className="text-[9px] text-ed-muted whitespace-nowrap">
              Bed {alert.bed} · {alert.patientName}
            </span>
            {alert.urgency !== 'emergency' && (
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-[10px] text-ed-muted hover:text-ed-text px-1"
                aria-label={`Dismiss alert: ${alert.message}`}
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

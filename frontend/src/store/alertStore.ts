import { create } from 'zustand'
import type { Alert } from '@/types'

const MAX_VISIBLE_ALERTS = 3
const AUTO_DISMISS_MS = 8_000

interface AlertStore {
  alerts: Alert[]
  lastUpdateTime: Date
  addAlert: (alert: Alert) => void
  dismissAlert: (id: string) => void
  clearAll: () => void
  setLastUpdateTime: (time: Date) => void
}

const autoDismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

function getAlertSourceKey(alert: Alert): string {
  switch (alert.type) {
    case 'unread-imaging':
    case 'imaging-unread':
      return `img-${alert.patientId}`
    case 'milestone-overdue':
      return `milestone-${alert.patientId}`
    case 'sepsis-escalation':
    case 'sepsis':
      return `sepsis-${alert.patientId}`
    case 'high-acuity-arrival':
      return `ha-${alert.patientId}`
    case 'critical-lab':
      return alert.id
    case 'new-patient':
      return alert.id
    default:
      return alert.id
  }
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  lastUpdateTime: new Date(),

  addAlert: (alert) => {
    const sourceKey = getAlertSourceKey(alert)

    const existingIdx = get().alerts.findIndex(
      (a) => !a.dismissed && getAlertSourceKey(a) === sourceKey,
    )

    let alerts: Alert[]

    if (existingIdx >= 0) {
      const existing = get().alerts[existingIdx]
      const urgencyRank = { warning: 0, critical: 1, emergency: 2 }
      if (urgencyRank[alert.urgency] <= urgencyRank[existing.urgency]) return

      const timer = autoDismissTimers.get(existing.id)
      if (timer) {
        clearTimeout(timer)
        autoDismissTimers.delete(existing.id)
      }

      alerts = get().alerts.filter((a) => a.id !== existing.id)
      alerts = [alert, ...alerts.filter((a) => !a.dismissed)]
    } else {
      alerts = [alert, ...get().alerts.filter((a) => !a.dismissed)]
    }

    if (alerts.length > MAX_VISIBLE_ALERTS) {
      alerts = alerts.slice(0, MAX_VISIBLE_ALERTS)
    }
    set({ alerts })

    if (alert.urgency !== 'emergency') {
      const timer = setTimeout(() => {
        get().dismissAlert(alert.id)
        autoDismissTimers.delete(alert.id)
      }, AUTO_DISMISS_MS)
      autoDismissTimers.set(alert.id, timer)
    }
  },

  dismissAlert: (id) => {
    const timer = autoDismissTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      autoDismissTimers.delete(id)
    }
    set({
      alerts: get().alerts.filter((a) => a.id !== id),
    })
  },

  clearAll: () => {
    autoDismissTimers.forEach((timer) => clearTimeout(timer))
    autoDismissTimers.clear()
    set({ alerts: [] })
  },

  setLastUpdateTime: (time) => set({ lastUpdateTime: time }),
}))

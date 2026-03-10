import type { Patient } from '@/types'

export function generateAiSuggestion(patient: Patient): string {
  const hasPendingTrop = patient.labs.some(
    (l) => l.name.toLowerCase().includes('troponin') && !l.resultedAt,
  )
  if (hasPendingTrop) return 'Auto-check delta trops'

  const hasUnreadImaging = patient.imaging.some((img) => {
    if (img.status !== 'complete') return false
    const minutesSinceOrder =
      (Date.now() - img.orderedAt.getTime()) / 60_000
    return minutesSinceOrder > img.alertIfUnreadMinutes
  })
  if (hasUnreadImaging) return '"What\'s pending?" escalation'

  const pendingOrders = [
    ...patient.labs.filter((l) => !l.resultedAt),
    ...patient.imaging.filter((i) => i.status !== 'read'),
  ]
  if (pendingOrders.length >= 3) return 'Draft order bundle + timer'

  if (
    patient.esi >= 4 &&
    patient.chiefComplaint.toLowerCase().includes('lac')
  ) {
    return 'Procedure note + AVS draft'
  }

  if (patient.dispositionStatus === 'dispo-ready') {
    return 'Predict fastest dispos'
  }

  if (patient.sepsisWatch) return 'Sepsis bundle compliance check'

  if (patient.riskFlags.some((f) => f.severity === 'critical')) {
    return 'Escalation pathway review'
  }

  if (pendingOrders.length > 0) return 'Draft order bundle + timer'

  if (patient.bed === 'WR') return 'Predict fastest dispos'

  return 'Chart review + reassess'
}

export function generateTop5Summary(patients: Patient[]): string {
  const sorted = [...patients].sort((a, b) => b.riskScore - a.riskScore)
  const top5 = sorted.slice(0, 5)

  return top5
    .map((p, i) => {
      const flags = p.riskFlags.map((f) => f.label).join(', ')
      const critLabs = p.labs
        .filter((l) => l.isCritical)
        .map((l) => `${l.name} ${l.value}`)
        .join(', ')
      const unreadImaging = p.imaging
        .filter((img) => img.status === 'complete')
        .map((img) => `${img.type} unread`)
        .join(', ')

      const details = [flags, critLabs, unreadImaging].filter(Boolean).join('; ')

      return `${i + 1}. ${p.name} Bed ${p.bed} — ${p.chiefComplaint} (${details || 'monitoring'})`
    })
    .join('\n')
}

export function generateHandoffSummary(patient: Patient): string {
  const flags = patient.riskFlags.map((f) => f.label).join(', ')
  const pendingLabs = patient.labs
    .filter((l) => !l.resultedAt)
    .map((l) => l.name)
    .join(', ')
  const pendingImaging = patient.imaging
    .filter((i) => i.status !== 'read')
    .map((i) => `${i.type} (${i.status})`)
    .join(', ')
  const activeConsults = patient.consults
    .filter((c) => c.status !== 'seen')
    .map((c) => `${c.specialty} (${c.status})`)
    .join(', ')

  const lines = [
    `Bed ${patient.bed}: ${patient.name} — ${patient.age}${patient.sex} — ${patient.chiefComplaint}`,
  ]
  if (flags) lines.push(`  Risk: ${flags}`)
  lines.push(`  Next: ${patient.nextMilestone.description}${patient.nextMilestone.isOverdue ? ' [OVERDUE]' : ''}`)
  if (pendingLabs) lines.push(`  Pending labs: ${pendingLabs}`)
  if (pendingImaging) lines.push(`  Pending imaging: ${pendingImaging}`)
  if (activeConsults) lines.push(`  Consults: ${activeConsults}`)
  lines.push(`  Dispo: ${patient.dispositionStatus}`)

  return lines.join('\n')
}

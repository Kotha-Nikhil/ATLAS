import { useMemo } from 'react'
import { usePatientStore } from '@/store/patientStore'
import type { Patient } from '@/types'

function computeRiskScore(patient: Patient): number {
  let score = 0

  switch (patient.esi) {
    case 1: score += 40; break
    case 2: score += 30; break
    case 3: score += 15; break
    case 4: score += 5; break
    case 5: score += 2; break
  }

  for (const flag of patient.riskFlags) {
    switch (flag.severity) {
      case 'critical': score += 20; break
      case 'high': score += 10; break
      case 'watch': score += 3; break
    }
  }

  if (patient.nextMilestone.isOverdue) {
    const overdueMinutes =
      (Date.now() - patient.nextMilestone.dueTime.getTime()) / 60_000
    score += Math.min(20, Math.floor(overdueMinutes / 10) * 5)
  }

  const criticalLabs = patient.labs.filter((l) => l.isCritical)
  score += criticalLabs.length * 10

  const hoursWaiting = (Date.now() - patient.timeIn.getTime()) / 3_600_000
  if (hoursWaiting > 4) score += 10
  else if (hoursWaiting > 2) score += 5

  if (patient.sepsisWatch) score += 15

  return Math.min(100, score)
}

export function useRiskScoring() {
  const patients = usePatientStore((s) => s.patients)

  const rankedPatients = useMemo(() => {
    const scored = patients.map((p) => ({
      ...p,
      riskScore: computeRiskScore(p),
    }))
    return scored.sort((a, b) => b.riskScore - a.riskScore)
  }, [patients])

  const topRisk = useMemo(() => rankedPatients.slice(0, 3), [rankedPatients])
  const top5 = useMemo(() => rankedPatients.slice(0, 5), [rankedPatients])

  return { rankedPatients, topRisk, top5 }
}

import { useMemo } from 'react'
import { usePatientStore } from '@/store/patientStore'
import type { Patient } from '@/types'

export interface FastDispoCandidate {
  patient: Patient
  estimatedMinutes: number
  reason: string
}

export function useFastDispo(): FastDispoCandidate[] {
  const patients = usePatientStore((s) => s.patients)

  return useMemo(() => {
    const candidates: FastDispoCandidate[] = []

    for (const patient of patients) {
      if (patient.dispositionStatus === 'discharged' || patient.dispositionStatus === 'admitted') {
        continue
      }

      const pendingLabs = patient.labs.filter((l) => !l.resultedAt)
      const pendingImaging = patient.imaging.filter((i) => i.status !== 'read')
      const hasCriticalFlags = patient.riskFlags.some((f) => f.severity === 'critical')

      if (patient.dispositionStatus === 'dispo-ready') {
        candidates.push({
          patient,
          estimatedMinutes: 15 + pendingLabs.length * 10,
          reason: 'Dispo-ready — awaiting final paperwork',
        })
        continue
      }

      if (
        patient.esi >= 4 &&
        !hasCriticalFlags &&
        pendingLabs.length === 0 &&
        pendingImaging.length <= 1
      ) {
        candidates.push({
          patient,
          estimatedMinutes: 20 + pendingImaging.length * 15,
          reason: `Low acuity (ESI ${patient.esi}) — minimal pending`,
        })
        continue
      }

      if (
        patient.esi >= 3 &&
        !hasCriticalFlags &&
        pendingLabs.length === 0 &&
        pendingImaging.length === 0 &&
        patient.consults.every((c) => c.status === 'seen')
      ) {
        candidates.push({
          patient,
          estimatedMinutes: 30,
          reason: 'All results in — ready for decision',
        })
      }
    }

    return candidates.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)
  }, [patients])
}

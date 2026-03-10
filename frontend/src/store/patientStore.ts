import { create } from 'zustand'
import type { Patient, DashboardMetrics, LWBSRisk } from '@/types'

interface PatientStore {
  patients: Patient[]
  metrics: DashboardMetrics
  overdueFilter: boolean
  tickCount: number
  loading: boolean
  error: string | null
  setPatients: (patients: Patient[]) => void
  updatePatient: (id: string, updates: Partial<Patient>) => void
  addPatient: (patient: Patient) => void
  removePatient: (id: string) => void
  setOverdueFilter: (on: boolean) => void
  recomputeMetrics: () => void
  incrementTick: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

function computeMetrics(patients: Patient[]): DashboardMetrics {
  const patientsIn = patients.filter((p) => p.bed !== 'WR').length
  const esi12Count = patients.filter((p) => p.esi <= 2).length
  const waitingCount = patients.filter((p) => p.bed === 'WR').length
  const pendingDispoCount = patients.filter((p) => p.dispositionStatus === 'dispo-ready').length

  const beddedPatients = patients.filter((p) => p.bed !== 'WR')
  const avgDoorToDoc =
    beddedPatients.length > 0
      ? beddedPatients.reduce((sum, p) => {
          return sum + (Date.now() - p.timeIn.getTime()) / 60_000
        }, 0) / beddedPatients.length
      : 0

  let lwbsRisk: LWBSRisk = 'LOW'
  if (waitingCount > 5 || avgDoorToDoc > 60) lwbsRisk = 'HIGH'
  else if (waitingCount > 3 || avgDoorToDoc > 30) lwbsRisk = 'MED'

  return {
    patientsIn,
    esi12Count,
    waitingCount,
    pendingDispoCount,
    doorToDocMinutes: Math.round(avgDoorToDoc),
    lwbsRisk,
  }
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: [],
  metrics: {
    patientsIn: 0,
    esi12Count: 0,
    waitingCount: 0,
    pendingDispoCount: 0,
    doorToDocMinutes: 0,
    lwbsRisk: 'LOW',
  },
  overdueFilter: false,
  tickCount: 0,
  loading: true,
  error: null,

  setPatients: (patients) => {
    set({ patients, metrics: computeMetrics(patients) })
  },

  updatePatient: (id, updates) => {
    const patients = get().patients.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    )
    set({ patients, metrics: computeMetrics(patients) })
  },

  addPatient: (patient) => {
    const patients = [...get().patients, patient]
    set({ patients, metrics: computeMetrics(patients) })
  },

  removePatient: (id) => {
    const patients = get().patients.filter((p) => p.id !== id)
    set({ patients, metrics: computeMetrics(patients) })
  },

  setOverdueFilter: (on) => set({ overdueFilter: on }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  recomputeMetrics: () => {
    set({ metrics: computeMetrics(get().patients) })
  },

  incrementTick: () => {
    const newTick = get().tickCount + 1
    set({ tickCount: newTick, metrics: computeMetrics(get().patients) })
  },
}))

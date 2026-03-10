import { useEffect, useRef } from 'react'
import { usePatientStore } from '@/store/patientStore'
import { useAlertStore } from '@/store/alertStore'
import { fetchPatients, fetchPatientLabs, fetchPatientImaging, getWsUrl } from '@/lib/api'
import { mapPatient, mapLab, mapImaging, mapAlert } from '@/lib/mappers'
import type { Alert } from '@/types'

export function useRealtimeEvents() {
  const setPatients = usePatientStore((s) => s.setPatients)
  const updatePatient = usePatientStore((s) => s.updatePatient)
  const addPatient = usePatientStore((s) => s.addPatient)
  const incrementTick = usePatientStore((s) => s.incrementTick)
  const addAlert = useAlertStore((s) => s.addAlert)
  const setLastUpdateTime = useAlertStore((s) => s.setLastUpdateTime)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      try {
        const apiPatients = await fetchPatients()
        if (cancelled) return

        const patientsWithDetails = await Promise.all(
          apiPatients.map(async (ap) => {
            const [labs, imaging] = await Promise.all([
              fetchPatientLabs(ap.id).catch(() => []),
              fetchPatientImaging(ap.id).catch(() => []),
            ])
            return mapPatient({ ...ap, labs, imaging })
          }),
        )

        if (!cancelled) {
          setPatients(patientsWithDetails)
        }
      } catch (err) {
        console.error('Failed to load patients:', err)
      }
    }

    loadInitialData()

    function connect() {
      if (cancelled) return

      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWsEvent(data)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimeout.current = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    function handleWsEvent(data: Record<string, unknown>) {
      const now = new Date()

      switch (data.type) {
        case 'lab_resulted': {
          const patientId = data.patient_id as string
          const labData = data.lab as Record<string, unknown>
          if (labData) {
            const lab = mapLab(labData as never)
            const patients = usePatientStore.getState().patients
            const patient = patients.find((p) => p.id === patientId)
            if (patient) {
              const existingIdx = patient.labs.findIndex((l) => l.id === lab.id)
              const updatedLabs =
                existingIdx >= 0
                  ? patient.labs.map((l) => (l.id === lab.id ? lab : l))
                  : [...patient.labs, lab]
              updatePatient(patientId, { labs: updatedLabs })
            }
          }
          setLastUpdateTime(now)
          break
        }

        case 'imaging_updated': {
          const patientId = data.patient_id as string
          const imgData = data.imaging as Record<string, unknown>
          if (imgData) {
            const img = mapImaging(imgData as never)
            const patients = usePatientStore.getState().patients
            const patient = patients.find((p) => p.id === patientId)
            if (patient) {
              const existingIdx = patient.imaging.findIndex((i) => i.id === img.id)
              const updatedImaging =
                existingIdx >= 0
                  ? patient.imaging.map((i) => (i.id === img.id ? img : i))
                  : [...patient.imaging, img]
              updatePatient(patientId, { imaging: updatedImaging })
            }
          }
          setLastUpdateTime(now)
          break
        }

        case 'new_patient':
        case 'high_acuity_arrival': {
          const patientData = data.patient as Record<string, unknown>
          if (patientData) {
            const patient = mapPatient(patientData as never)
            addPatient(patient)
          }
          setLastUpdateTime(now)
          break
        }

        case 'alert_fired': {
          const alertData = data.alert as Record<string, unknown>
          if (alertData) {
            const alert = mapAlert(alertData as never)
            addAlert(alert)
          }
          setLastUpdateTime(now)
          break
        }

        case 'sepsis_escalation': {
          const patientId = data.patient_id as string
          const message = data.message as string
          const urgency = (data.urgency as string) || 'warning'
          const alert: Alert = {
            id: `sepsis-${patientId}-${Date.now()}`,
            patientId,
            patientName: '',
            bed: '',
            type: 'sepsis-escalation',
            message,
            urgency: urgency as Alert['urgency'],
            timestamp: now,
            dismissed: false,
          }
          addAlert(alert)
          setLastUpdateTime(now)
          break
        }

        case 'tick': {
          incrementTick()
          setLastUpdateTime(now)
          break
        }

        case 'metrics_updated': {
          setLastUpdateTime(now)
          break
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [setPatients, updatePatient, addPatient, addAlert, setLastUpdateTime, incrementTick])
}

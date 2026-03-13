import { useEffect, useRef } from 'react'
import { usePatientStore } from '@/store/patientStore'
import { useAlertStore } from '@/store/alertStore'
import { fetchPatientsFull, getWsUrl } from '@/lib/api'
import { mapPatient, mapLab, mapImaging, mapAlert } from '@/lib/mappers'
import type { Alert, Lab, ImagingOrder, Patient } from '@/types'
import type { ApiLab, ApiImaging, ApiPatient, ApiAlert } from '@/lib/api'

interface WsLabResulted {
  type: 'lab_resulted'
  patient_id: string
  lab: ApiLab
}

interface WsImagingUpdated {
  type: 'imaging_updated'
  patient_id: string
  imaging: ApiImaging
}

interface WsNewPatient {
  type: 'new_patient' | 'high_acuity_arrival'
  patient: ApiPatient
}

interface WsAlertFired {
  type: 'alert_fired'
  alert: ApiAlert
}

interface WsSepsisEscalation {
  type: 'sepsis_escalation'
  patient_id: string
  message: string
  urgency?: string
}

interface WsTick {
  type: 'tick'
}

interface WsMetricsUpdated {
  type: 'metrics_updated'
}

type WsMessage =
  | WsLabResulted
  | WsImagingUpdated
  | WsNewPatient
  | WsAlertFired
  | WsSepsisEscalation
  | WsTick
  | WsMetricsUpdated

function isWsMessage(data: unknown): data is WsMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'string'
  )
}

const MIN_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000

export function useRealtimeEvents() {
  const setPatients = usePatientStore((s) => s.setPatients)
  const updatePatient = usePatientStore((s) => s.updatePatient)
  const addPatient = usePatientStore((s) => s.addPatient)
  const incrementTick = usePatientStore((s) => s.incrementTick)
  const setLoading = usePatientStore((s) => s.setLoading)
  const setError = usePatientStore((s) => s.setError)
  const addAlert = useAlertStore((s) => s.addAlert)
  const setLastUpdateTime = useAlertStore((s) => s.setLastUpdateTime)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(MIN_RECONNECT_MS)

  useEffect(() => {
    let cancelled = false

    async function loadAllPatients() {
      const apiPatients = await fetchPatientsFull()
      if (cancelled) return []
      return apiPatients.map((ap) => mapPatient(ap))
    }

    async function loadInitialData() {
      setLoading(true)
      setError(null)
      try {
        const patients = await loadAllPatients()
        if (!cancelled) {
          setPatients(patients)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load patients')
          setLoading(false)
        }
      }
    }

    loadInitialData()

    function connect() {
      if (cancelled) return

      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelay.current = MIN_RECONNECT_MS
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (isWsMessage(data)) {
            handleWsEvent(data)
          }
        } catch {
          // malformed JSON
        }
      }

      ws.onclose = () => {
        if (!cancelled) {
          const delay = reconnectDelay.current
          reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_MS)
          reconnectTimeout.current = setTimeout(async () => {
            try {
              const patients = await loadAllPatients()
              if (!cancelled) setPatients(patients)
            } catch {
              // resync failed; will retry on next reconnect
            }
            connect()
          }, delay)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    function handleWsEvent(msg: WsMessage) {
      const now = new Date()

      switch (msg.type) {
        case 'lab_resulted': {
          if (msg.lab) {
            const lab: Lab = mapLab(msg.lab)
            const patients = usePatientStore.getState().patients
            const patient = patients.find((p) => p.id === msg.patient_id)
            if (patient) {
              const existingIdx = patient.labs.findIndex((l) => l.id === lab.id)
              const updatedLabs: Lab[] =
                existingIdx >= 0
                  ? patient.labs.map((l) => (l.id === lab.id ? lab : l))
                  : [...patient.labs, lab]
              updatePatient(msg.patient_id, { labs: updatedLabs })
            }
          }
          setLastUpdateTime(now)
          break
        }

        case 'imaging_updated': {
          if (msg.imaging) {
            const img: ImagingOrder = mapImaging(msg.imaging)
            const patients = usePatientStore.getState().patients
            const patient = patients.find((p) => p.id === msg.patient_id)
            if (patient) {
              const existingIdx = patient.imaging.findIndex((i) => i.id === img.id)
              const updatedImaging: ImagingOrder[] =
                existingIdx >= 0
                  ? patient.imaging.map((i) => (i.id === img.id ? img : i))
                  : [...patient.imaging, img]
              updatePatient(msg.patient_id, { imaging: updatedImaging })
            }
          }
          setLastUpdateTime(now)
          break
        }

        case 'new_patient':
        case 'high_acuity_arrival': {
          if (msg.patient) {
            const patient: Patient = mapPatient(msg.patient)
            addPatient(patient)
          }
          setLastUpdateTime(now)
          break
        }

        case 'alert_fired': {
          if (msg.alert) {
            const alert = mapAlert(msg.alert)
            addAlert(alert)
          }
          setLastUpdateTime(now)
          break
        }

        case 'sepsis_escalation': {
          const alert: Alert = {
            id: `sepsis-${msg.patient_id}-${Date.now()}`,
            patientId: msg.patient_id,
            patientName: '',
            bed: '',
            type: 'sepsis-escalation',
            message: msg.message,
            urgency: (msg.urgency as Alert['urgency']) || 'warning',
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
  }, [setPatients, updatePatient, addPatient, addAlert, setLastUpdateTime, incrementTick, setLoading, setError])
}

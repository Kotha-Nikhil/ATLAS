import type { Patient, Lab, ImagingOrder, Consult, RiskFlag, Alert, DashboardMetrics, ESILevel, OwnerRole, DispositionStatus, ImagingStatus, AlertUrgency } from '@/types'
import type { ApiPatient, ApiLab, ApiImaging, ApiConsult, ApiRiskFlag, ApiAlert, ApiMetrics } from './api'

function parseEsi(esi: string): ESILevel {
  const n = parseInt(esi, 10)
  if (n >= 1 && n <= 5) return n as ESILevel
  return 3
}

function parseOwner(role: string): OwnerRole {
  const r = role.toUpperCase()
  if (r === 'MD' || r === 'PA' || r === 'RN' || r === 'CHG') return r as OwnerRole
  return 'MD'
}

function parseDispo(status: string): DispositionStatus {
  const s = status.toLowerCase().replace(' ', '-')
  if (s === 'active' || s === 'dispo-ready' || s === 'admitted' || s === 'discharged') return s
  return 'active'
}

function parseImagingStatus(status: string): ImagingStatus {
  const s = status.toLowerCase().replace(' ', '-')
  if (s === 'ordered' || s === 'in-scanner' || s === 'complete' || s === 'read') return s
  return 'ordered'
}

function parseUrgency(urgency: string): AlertUrgency {
  const u = urgency.toLowerCase()
  if (u === 'warning' || u === 'critical' || u === 'emergency') return u
  return 'warning'
}

export function mapLab(api: ApiLab): Lab {
  return {
    id: api.id,
    name: api.name,
    orderedAt: new Date(api.ordered_at),
    resultedAt: api.resulted_at ? new Date(api.resulted_at) : undefined,
    value: api.value ?? undefined,
    isCritical: api.is_critical,
    alertThreshold: api.alert_threshold ?? undefined,
  }
}

export function mapImaging(api: ApiImaging): ImagingOrder {
  return {
    id: api.id,
    type: api.imaging_type,
    orderedAt: new Date(api.ordered_at),
    status: parseImagingStatus(api.status),
    readAt: api.read_at ? new Date(api.read_at) : undefined,
    alertIfUnreadMinutes: api.alert_if_unread_minutes,
  }
}

export function mapConsult(api: ApiConsult): Consult {
  return {
    id: api.id,
    specialty: api.specialty,
    calledAt: new Date(api.called_at),
    callbackAt: api.callback_at ? new Date(api.callback_at) : undefined,
    status: api.status as Consult['status'],
    patientId: api.patient_id,
  }
}

export function mapRiskFlag(api: ApiRiskFlag): RiskFlag {
  return {
    label: api.label,
    severity: api.severity as RiskFlag['severity'],
  }
}

export function mapPatient(api: ApiPatient): Patient {
  return {
    id: api.id,
    bed: api.bed,
    name: api.display_name,
    age: api.age,
    sex: api.sex as 'M' | 'F',
    esi: parseEsi(api.esi),
    chiefComplaint: api.chief_complaint,
    chiefComplaintIcon: api.chief_complaint_icon ?? '',
    riskFlags: (api.risk_flags ?? []).map(mapRiskFlag),
    timeIn: new Date(api.time_in),
    nextMilestone: {
      description: api.milestone_description ?? '',
      dueTime: api.milestone_due_time ? new Date(api.milestone_due_time) : new Date(),
      isOverdue: api.milestone_is_overdue,
    },
    owner: parseOwner(api.owner_role),
    aiAssist: api.ai_assist ?? '',
    labs: (api.labs ?? []).map(mapLab),
    imaging: (api.imaging ?? []).map(mapImaging),
    consults: (api.consults ?? []).map(mapConsult),
    dispositionStatus: parseDispo(api.disposition_status),
    riskScore: api.risk_score,
    sepsisWatch: api.sepsis_watch,
  }
}

export function mapAlert(api: ApiAlert): Alert {
  const typeMap: Record<string, Alert['type']> = {
    'critical-lab': 'critical-lab',
    'unread-imaging': 'unread-imaging',
    'overdue-milestone': 'milestone-overdue',
    'new-patient': 'new-patient',
    'sepsis-escalation': 'sepsis-escalation',
    'high-acuity-arrival': 'high-acuity-arrival',
  }

  return {
    id: api.id,
    patientId: api.patient_id ?? '',
    patientName: '',
    bed: api.bed ?? '',
    type: typeMap[api.alert_type] ?? 'critical-lab',
    message: api.message,
    urgency: parseUrgency(api.urgency),
    timestamp: new Date(api.created_at),
    dismissed: api.dismissed,
  }
}

export function mapMetrics(api: ApiMetrics): DashboardMetrics {
  return {
    patientsIn: api.patients_in,
    esi12Count: api.esi12_count,
    waitingCount: api.waiting_count,
    pendingDispoCount: api.pending_dispo_count,
    doorToDocMinutes: api.door_to_doc_minutes,
    lwbsRisk: (api.lwbs_risk as DashboardMetrics['lwbsRisk']) || 'LOW',
  }
}

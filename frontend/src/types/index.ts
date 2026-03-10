export type OwnerRole = 'MD' | 'PA' | 'RN' | 'CHG'
export type ESILevel = 1 | 2 | 3 | 4 | 5
export type DispositionStatus = 'active' | 'dispo-ready' | 'admitted' | 'discharged'
export type RiskSeverity = 'critical' | 'high' | 'watch'
export type LWBSRisk = 'LOW' | 'MED' | 'HIGH'
export type ImagingStatus = 'ordered' | 'in-scanner' | 'complete' | 'read'
export type AlertUrgency = 'warning' | 'critical' | 'emergency'

export interface RiskFlag {
  label: string
  severity: RiskSeverity
}

export interface Milestone {
  description: string
  dueTime: Date
  isOverdue: boolean
  completedTime?: Date
}

export interface Lab {
  id: string
  name: string
  orderedAt: Date
  resultedAt?: Date
  value?: string
  isCritical?: boolean
  alertThreshold?: string
}

export interface ImagingOrder {
  id: string
  type: string
  orderedAt: Date
  status: ImagingStatus
  readAt?: Date
  alertIfUnreadMinutes: number
}

export interface Consult {
  id: string
  specialty: string
  calledAt: Date
  callbackAt?: Date
  status: 'called' | 'callback-received' | 'seen'
  patientId: string
}

export interface Patient {
  id: string
  bed: string
  name: string
  age: number
  sex: 'M' | 'F'
  esi: ESILevel
  chiefComplaint: string
  chiefComplaintIcon: string
  riskFlags: RiskFlag[]
  timeIn: Date
  nextMilestone: Milestone
  owner: OwnerRole
  aiAssist: string
  labs: Lab[]
  imaging: ImagingOrder[]
  consults: Consult[]
  dispositionStatus: DispositionStatus
  riskScore: number
  sepsisWatch?: boolean
}

export interface DashboardMetrics {
  patientsIn: number
  esi12Count: number
  waitingCount: number
  pendingDispoCount: number
  doorToDocMinutes: number
  lwbsRisk: LWBSRisk
}

export interface Alert {
  id: string
  patientId: string
  patientName: string
  bed: string
  type:
    | 'critical-lab'
    | 'imaging-unread'
    | 'milestone-overdue'
    | 'sepsis'
    | 'unread-imaging'
    | 'new-patient'
    | 'sepsis-escalation'
    | 'high-acuity-arrival'
  message: string
  urgency: AlertUrgency
  timestamp: Date
  dismissed: boolean
}

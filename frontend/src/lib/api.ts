const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

function getToken(): string | null {
  return localStorage.getItem('atlas_token')
}

export function setToken(token: string) {
  localStorage.setItem('atlas_token', token)
}

export function clearToken() {
  localStorage.removeItem('atlas_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  if (res.status === 204) return {} as T
  return res.json()
}

// --- Auth ---

export interface LoginResponse {
  token: string
  user: ApiUser
}

export interface ApiUser {
  id: string
  email: string
  name: string
  role: string
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getMe() {
  return request<ApiUser>('/api/auth/me')
}

// --- Patients ---

export interface ApiPatient {
  id: string
  bed: string
  display_name: string
  age: number
  sex: string
  esi: string
  chief_complaint: string
  chief_complaint_icon: string | null
  risk_score: number
  disposition_status: string
  sepsis_watch: boolean
  owner_role: string
  time_in: string
  milestone_description: string | null
  milestone_due_time: string | null
  milestone_is_overdue: boolean
  ai_assist: string | null
  created_at: string
  updated_at: string
  risk_flags?: ApiRiskFlag[]
  labs?: ApiLab[]
  imaging?: ApiImaging[]
  consults?: ApiConsult[]
}

export interface ApiRiskFlag {
  id: string
  patient_id: string
  label: string
  severity: string
}

export interface ApiLab {
  id: string
  patient_id: string
  name: string
  status: string
  ordered_at: string
  resulted_at: string | null
  value: string | null
  is_critical: boolean
  alert_threshold: string | null
}

export interface ApiImaging {
  id: string
  patient_id: string
  imaging_type: string
  status: string
  ordered_at: string
  read_at: string | null
  alert_if_unread_minutes: number
}

export interface ApiConsult {
  id: string
  patient_id: string
  specialty: string
  called_at: string
  callback_at: string | null
  status: string
}

export interface ApiAlert {
  id: string
  patient_id: string | null
  bed: string | null
  message: string
  urgency: string
  alert_type: string
  dismissed: boolean
  created_at: string
  dismissed_at: string | null
  dismissed_by: string | null
}

export interface ApiMetrics {
  patients_in: number
  esi12_count: number
  waiting_count: number
  pending_dispo_count: number
  door_to_doc_minutes: number
  lwbs_risk: string
}

export function fetchPatients() {
  return request<ApiPatient[]>('/api/patients')
}

export function fetchPatient(id: string) {
  return request<ApiPatient>(`/api/patients/${id}`)
}

export function fetchAlerts() {
  return request<ApiAlert[]>('/api/alerts')
}

export function dismissAlertApi(id: string) {
  return request<unknown>(`/api/alerts/${id}/dismiss`, { method: 'POST' })
}

export function fetchMetrics() {
  return request<ApiMetrics>('/api/metrics')
}

export function fetchPatientLabs(patientId: string) {
  return request<ApiLab[]>(`/api/patients/${patientId}/labs`)
}

export function fetchPatientImaging(patientId: string) {
  return request<ApiImaging[]>(`/api/patients/${patientId}/imaging`)
}

export function aiSuggest(patientId: string) {
  return request<{ suggestion: string }>('/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId }),
  })
}

export function aiTop5() {
  return request<{ suggestion: string }>('/api/ai/top5', { method: 'POST' })
}

export function aiHandoff() {
  return request<{ suggestion: string }>('/api/ai/handoff', { method: 'POST' })
}

export function getWsUrl(): string {
  const base = API_BASE.replace(/^http/, 'ws')
  const token = getToken()
  return `${base}/ws${token ? `?token=${token}` : ''}`
}

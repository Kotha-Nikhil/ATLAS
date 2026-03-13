import { useState, useCallback } from 'react'

const SMART_SANDBOX_URL = 'https://r4.smarthealthit.org'
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface FHIRName {
  use?: string
  text?: string
  family?: string
  given?: string[]
}

interface FHIRPatient {
  id: string
  resourceType: 'Patient'
  name?: FHIRName[]
  gender?: string
  birthDate?: string
}

interface FHIRBundle {
  resourceType: string
  entry?: Array<{ resource: FHIRPatient }>
}

function getDisplayName(patient: FHIRPatient): string {
  if (!patient.name || patient.name.length === 0) return '?.?.'
  const n = patient.name[0]
  if (n.text) return n.text
  const first = n.given?.[0]?.[0] ?? '?'
  const last = n.family?.[0] ?? '?'
  return `${first}.${last}.`
}

function computeAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null
  const dob = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  if (
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  ) {
    age--
  }
  return age
}

type ImportStatus = 'idle' | 'importing' | 'success' | 'error'

interface PatientRow {
  fhirPatient: FHIRPatient
  displayName: string
  age: number | null
  gender: string
  importStatus: ImportStatus
}

export function FHIRImportPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const searchFHIRPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPatients([])
    try {
      const url = `${SMART_SANDBOX_URL}/Patient?_count=5${searchQuery ? `&name=${encodeURIComponent(searchQuery)}` : ''}`
      const resp = await fetch(url, {
        headers: { Accept: 'application/fhir+json' },
      })
      if (!resp.ok) throw new Error(`SMART sandbox returned ${resp.status}`)
      const bundle: FHIRBundle = await resp.json()
      const entries = bundle.entry ?? []
      const rows: PatientRow[] = entries.map((e) => ({
        fhirPatient: e.resource,
        displayName: getDisplayName(e.resource),
        age: computeAge(e.resource.birthDate),
        gender: e.resource.gender ?? 'unknown',
        importStatus: 'idle' as ImportStatus,
      }))
      setPatients(rows)
      if (rows.length === 0) setError('No patients found in SMART sandbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query SMART sandbox')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const importPatient = useCallback(async (index: number) => {
    setPatients((prev) =>
      prev.map((p, i) => (i === index ? { ...p, importStatus: 'importing' } : p)),
    )

    const row = patients[index]
    const fp = row.fhirPatient
    const initials = row.displayName.length <= 5 ? row.displayName : `${row.displayName[0]}.${(fp.name?.[0]?.family?.[0] ?? '?')}.`

    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: fp.id,
            name: [{ use: 'anonymous', text: initials }],
            gender: fp.gender ?? 'unknown',
            extension: [
              { url: 'http://atlas.ed/fhir/bed', valueString: 'WR' },
              { url: 'http://atlas.ed/fhir/age', valueInteger: row.age ?? 0 },
              { url: 'http://atlas.ed/fhir/esi', valueInteger: 3 },
              { url: 'http://atlas.ed/fhir/chiefComplaint', valueString: 'FHIR Sandbox Import' },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Encounter',
            status: 'in-progress',
            class: { code: 'EMER', display: 'Emergency' },
          },
        },
      ],
    }

    try {
      const resp = await fetch(`${API_BASE}/api/fhir/Patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(bundle),
      })
      if (!resp.ok) throw new Error(`Import failed: ${resp.status}`)
      setPatients((prev) =>
        prev.map((p, i) => (i === index ? { ...p, importStatus: 'success' } : p)),
      )
    } catch {
      setPatients((prev) =>
        prev.map((p, i) => (i === index ? { ...p, importStatus: 'error' } : p)),
      )
    }
  }, [patients])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-labelledby="fhir-import-title">
      <div className="w-full max-w-lg rounded-lg border border-ed-border bg-ed-bg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="fhir-import-title" className="text-sm font-bold uppercase tracking-wider text-ed-teal font-mono">
              SMART on FHIR Import
            </h2>
            <span className="text-[9px] text-ed-muted font-mono">
              FHIR R4 · SMART Health IT Sandbox
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-ed-muted hover:text-ed-text hover:bg-white/5 transition-colors"
            aria-label="Close FHIR import"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchFHIRPatients() }}
            placeholder="Search by name (or leave blank for all)"
            className="flex-1 rounded border border-ed-border bg-ed-surface px-3 py-2 text-xs text-ed-text placeholder:text-ed-muted focus:border-ed-teal focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={searchFHIRPatients}
            disabled={loading}
            className="rounded bg-ed-teal px-4 py-2 text-xs font-bold text-white hover:bg-ed-teal/80 disabled:opacity-50 transition-colors font-mono"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded border border-ed-red/30 bg-ed-red/10 px-3 py-2 text-xs text-ed-red">
            {error}
          </div>
        )}

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {patients.map((row, i) => (
            <div key={row.fhirPatient.id} className="flex items-center justify-between rounded border border-ed-border bg-ed-surface px-3 py-2">
              <div>
                <span className="text-xs font-bold text-ed-text font-mono">{row.displayName}</span>
                <span className="text-[10px] text-ed-muted ml-2">
                  {row.age !== null ? `${row.age}y` : '?'} · {row.gender}
                </span>
                <span className="text-[9px] text-ed-muted block font-mono">ID: {row.fhirPatient.id}</span>
              </div>
              <div>
                {row.importStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={() => importPatient(i)}
                    className="rounded border border-ed-teal/30 bg-ed-teal/10 px-3 py-1 text-[10px] font-bold text-ed-teal hover:bg-ed-teal/20 transition-colors font-mono"
                  >
                    Import to ATLAS
                  </button>
                )}
                {row.importStatus === 'importing' && (
                  <span className="text-[10px] text-ed-muted font-mono">Importing...</span>
                )}
                {row.importStatus === 'success' && (
                  <span className="text-[10px] text-ed-green font-bold font-mono">Imported</span>
                )}
                {row.importStatus === 'error' && (
                  <button
                    type="button"
                    onClick={() => importPatient(i)}
                    className="rounded border border-ed-red/30 bg-ed-red/10 px-3 py-1 text-[10px] font-bold text-ed-red hover:bg-ed-red/20 transition-colors font-mono"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ed-border pt-3">
          <span className="text-[9px] text-ed-muted font-mono">
            Powered by SMART Health IT
          </span>
          <span className="text-[9px] text-ed-muted font-mono">
            {SMART_SANDBOX_URL}
          </span>
        </div>
      </div>
    </div>
  )
}

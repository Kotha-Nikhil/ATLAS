import { usePatientStore } from '@/store/patientStore'
import { useRiskScoring } from '@/hooks/useRiskScoring'
import { PatientRow } from './PatientRow'

export function PatientTable() {
  const overdueFilter = usePatientStore((s) => s.overdueFilter)
  const tickCount = usePatientStore((s) => s.tickCount)
  const { rankedPatients } = useRiskScoring()

  const displayPatients = overdueFilter
    ? rankedPatients.filter((p) => p.nextMilestone.isOverdue)
    : rankedPatients

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" role="table" aria-label="Patient tracking board">
        <thead>
          <tr className="border-b border-ed-border bg-ed-surface/50">
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted">
              Bed
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted">
              Patient
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted text-center">
              ESI
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted">
              Chief Complaint
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted">
              Risk Flags
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted text-center">
              Time In
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted">
              Next Milestone
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted text-center">
              Owner
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ed-muted">
              AI Assist
            </th>
          </tr>
        </thead>
        <tbody>
          {displayPatients.map((patient) => (
            <PatientRow key={patient.id} patient={patient} tick={tickCount} />
          ))}
        </tbody>
      </table>
      {displayPatients.length === 0 && (
        <div className="flex items-center justify-center py-8 text-sm text-ed-muted">
          {overdueFilter
            ? 'No overdue milestones — all clear'
            : 'No patients loaded'}
        </div>
      )}
    </div>
  )
}

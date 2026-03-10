import { memo } from 'react'
import type { Patient } from '@/types'
import { RiskBadge } from './RiskBadge'
import { MilestoneBadge } from './MilestoneBadge'

const ownerColors: Record<string, string> = {
  MD: 'bg-ed-blue/20 text-ed-blue border-ed-blue/30',
  PA: 'bg-ed-green/20 text-ed-green border-ed-green/30',
  RN: 'bg-ed-purple/20 text-ed-purple border-ed-purple/30',
  CHG: 'bg-ed-teal/20 text-ed-teal border-ed-teal/30',
}

function formatTimeIn(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

function getESIColor(esi: number): string {
  switch (esi) {
    case 1: return 'text-ed-red font-bold'
    case 2: return 'text-ed-orange font-bold'
    case 3: return 'text-ed-yellow'
    case 4: return 'text-ed-green'
    case 5: return 'text-ed-muted'
    default: return 'text-ed-text'
  }
}

export const PatientRow = memo(function PatientRow({
  patient,
  tick: _tick,
}: {
  patient: Patient
  tick: number
}) {
  const timeIn = formatTimeIn(patient.timeIn)
  const isWR = patient.bed === 'WR'

  return (
    <tr
      className={`border-b border-ed-border hover:bg-white/[0.02] transition-colors ${
        patient.sepsisWatch ? 'bg-ed-red/5' : ''
      }`}
    >
      <td className="px-3 py-2 text-xs">
        <span className={`font-bold ${isWR ? 'text-ed-muted' : 'text-ed-teal'}`}>
          {patient.bed}
        </span>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-ed-text">
            {patient.name}
          </span>
          <span className="text-[10px] text-ed-muted">
            {patient.age}{patient.sex}
          </span>
        </div>
      </td>

      <td className="px-3 py-2 text-center">
        <span className={`text-xs ${getESIColor(patient.esi)}`}>
          {patient.esi}
        </span>
      </td>

      <td className="px-3 py-2">
        <span className="text-xs text-ed-text">
          {patient.chiefComplaintIcon} {patient.chiefComplaint}
        </span>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {patient.riskFlags.map((flag, i) => (
            <RiskBadge key={i} flag={flag} />
          ))}
          {patient.sepsisWatch && (
            <span
              className="inline-flex items-center rounded-full border border-ed-red/50 bg-ed-red/10 px-1.5 py-0.5 text-[10px] font-bold text-ed-red animate-flash-red"
              aria-label="Sepsis watch active"
            >
              🚨 SEPSIS WATCH
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-2 text-xs text-ed-muted text-center">
        {timeIn}
      </td>

      <td className="px-3 py-2">
        <MilestoneBadge milestone={patient.nextMilestone} />
      </td>

      <td className="px-3 py-2 text-center">
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${ownerColors[patient.owner]}`}
        >
          {patient.owner}
        </span>
      </td>

      <td className="px-3 py-2">
        <span className="text-[11px] text-ed-teal/80 italic">
          {patient.aiAssist}
        </span>
      </td>
    </tr>
  )
})

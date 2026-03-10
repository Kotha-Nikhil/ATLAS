import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePatientStore } from '@/store/patientStore'
import { generateHandoffSummary } from '@/utils/aiAssist'
import type { OwnerRole } from '@/types'

const ownerLabels: Record<OwnerRole, string> = {
  MD: 'Attending / MD',
  PA: 'PA / APP',
  RN: 'Nursing',
  CHG: 'Charge',
}

const ownerColors: Record<OwnerRole, string> = {
  MD: 'text-ed-blue',
  PA: 'text-ed-green',
  RN: 'text-ed-purple',
  CHG: 'text-ed-teal',
}

export function HandoffModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const patients = usePatientStore((s) => s.patients)

  const grouped = patients
    .filter((p) => p.bed !== 'WR')
    .reduce(
      (acc, p) => {
        if (!acc[p.owner]) acc[p.owner] = []
        acc[p.owner].push(p)
        return acc
      },
      {} as Record<OwnerRole, typeof patients>,
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ed-surface border-ed-border text-ed-text max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ed-teal font-bold tracking-wide">
            SHIFT HANDOFF SUMMARY
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {(Object.keys(grouped) as OwnerRole[]).map((owner) => (
            <div key={owner}>
              <h3
                className={`text-xs font-bold uppercase tracking-wider mb-2 ${ownerColors[owner]}`}
              >
                {ownerLabels[owner]} ({grouped[owner].length} pts)
              </h3>
              <div className="space-y-2">
                {grouped[owner]
                  .sort((a, b) => b.riskScore - a.riskScore)
                  .map((patient) => (
                    <div
                      key={patient.id}
                      className="rounded border border-ed-border p-2 bg-ed-bg"
                    >
                      <pre className="text-[11px] text-ed-text whitespace-pre-wrap font-mono">
                        {generateHandoffSummary(patient)}
                      </pre>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRiskScoring } from '@/hooks/useRiskScoring'
import { generateTop5Summary } from '@/utils/aiAssist'

export function Top5SickModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { top5 } = useRiskScoring()
  const summary = generateTop5Summary(top5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ed-surface border-ed-border text-ed-text max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-ed-red font-bold tracking-wide">
            TOP 5 SICKEST PATIENTS
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {top5.map((patient, i) => {
            const flags = patient.riskFlags.map((f) => f.label).join(', ')
            const critLabs = patient.labs
              .filter((l) => l.isCritical)
              .map((l) => `${l.name} ${l.value}`)
              .join(', ')

            return (
              <div
                key={patient.id}
                className="rounded border border-ed-border p-3 bg-ed-bg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-ed-red">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-bold">
                    {patient.name}
                  </span>
                  <span className="text-xs text-ed-teal">
                    Bed {patient.bed}
                  </span>
                  <span className="text-xs text-ed-muted">
                    {patient.age}{patient.sex}
                  </span>
                </div>
                <p className="text-xs text-ed-text mb-1">
                  {patient.chiefComplaintIcon} {patient.chiefComplaint}
                </p>
                {flags && (
                  <p className="text-[10px] text-ed-orange">
                    Risk: {flags}
                  </p>
                )}
                {critLabs && (
                  <p className="text-[10px] text-ed-red">
                    Critical: {critLabs}
                  </p>
                )}
                <p className="text-[10px] text-ed-muted mt-1">
                  Next: {patient.nextMilestone.description}
                  {patient.nextMilestone.isOverdue && (
                    <span className="text-ed-red"> [OVERDUE]</span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-3 p-3 rounded bg-ed-bg border border-ed-border">
          <h4 className="text-[10px] uppercase tracking-wider text-ed-teal mb-1">
            AI Summary
          </h4>
          <pre className="text-[11px] text-ed-text whitespace-pre-wrap font-mono">
            {summary}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}

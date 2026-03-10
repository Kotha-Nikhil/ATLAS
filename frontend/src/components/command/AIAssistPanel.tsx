import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePatientStore } from '@/store/patientStore'
import { generateAiSuggestion } from '@/utils/aiAssist'

export function AIAssistPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const patients = usePatientStore((s) => s.patients)
  const beddedPatients = patients.filter((p) => p.bed !== 'WR')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ed-surface border-ed-border text-ed-text max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ed-teal font-bold tracking-wide">
            AI WORKFLOW ASSIST
          </DialogTitle>
        </DialogHeader>
        <p className="text-[10px] text-ed-muted uppercase tracking-wider">
          Contextual suggestions per patient
        </p>
        <div className="space-y-2 mt-2">
          {beddedPatients.map((patient) => {
            const suggestion = generateAiSuggestion(patient)
            return (
              <div
                key={patient.id}
                className="rounded border border-ed-border p-3 bg-ed-bg"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ed-text">
                      {patient.name}
                    </span>
                    <span className="text-[10px] text-ed-teal">
                      Bed {patient.bed}
                    </span>
                  </div>
                  <span className="text-[10px] text-ed-muted">
                    ESI {patient.esi}
                  </span>
                </div>
                <p className="text-[11px] text-ed-teal/90 italic">
                  {suggestion}
                </p>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

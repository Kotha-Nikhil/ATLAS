import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFastDispo } from '@/hooks/useFastDispo'

export function FastDispoPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const candidates = useFastDispo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ed-surface border-ed-border text-ed-text max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ed-green font-bold tracking-wide">
            FAST DISPO CANDIDATES
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {candidates.length === 0 && (
            <p className="text-sm text-ed-muted py-4 text-center">
              No fast dispo candidates at this time
            </p>
          )}
          {candidates.map(({ patient, estimatedMinutes, reason }) => (
            <div
              key={patient.id}
              className="rounded border border-ed-border p-3 bg-ed-bg flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-ed-text">
                    {patient.name}
                  </span>
                  <span className="text-xs text-ed-teal">
                    Bed {patient.bed}
                  </span>
                </div>
                <p className="text-[11px] text-ed-muted">
                  {patient.chiefComplaintIcon} {patient.chiefComplaint}
                </p>
                <p className="text-[10px] text-ed-muted mt-0.5">{reason}</p>
              </div>
              <div className="flex flex-col items-center ml-3">
                <span className="text-lg font-bold text-ed-green">
                  ~{estimatedMinutes}m
                </span>
                <span className="text-[9px] text-ed-muted uppercase">
                  est. dispo
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

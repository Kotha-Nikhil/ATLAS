import { useMemo } from 'react'
import { usePatientStore } from '@/store/patientStore'
import type { Patient, ImagingOrder, Lab, Consult } from '@/types'
import {
  getUnreadUrgency,
  getUrgencyAnimationClass,
  getUrgencyBorderClass,
  getUrgencyBgClass,
} from '@/utils/alertAnimations'

interface PendingItem<T> {
  patient: Patient
  item: T
}

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

function ImagingSection({ items }: { items: PendingItem<ImagingOrder>[] }) {
  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-ed-muted mb-2 px-3">
        Imaging
      </h3>
      {items.length === 0 && (
        <p className="text-[11px] text-ed-muted px-3">No pending imaging</p>
      )}
      {items.map(({ patient, item }) => {
        const minutesSinceOrder =
          (Date.now() - item.orderedAt.getTime()) / 60_000
        const isUnreadComplete =
          item.status === 'complete' &&
          minutesSinceOrder > item.alertIfUnreadMinutes
        const urgency = isUnreadComplete
          ? getUnreadUrgency(minutesSinceOrder)
          : null

        const cardClasses = [
          'px-3 py-2 border-b border-ed-border transition-all',
          urgency ? getUrgencyAnimationClass(urgency) : '',
          urgency ? getUrgencyBorderClass(urgency) : '',
          urgency ? getUrgencyBgClass(urgency) : '',
          !urgency && isUnreadComplete ? 'bg-ed-red/5' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div key={item.id} className={cardClasses}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ed-text">
                {urgency === 'emergency' && '🚨 '}
                {item.type}
              </span>
              <span
                className={`text-[10px] ${
                  item.status === 'read'
                    ? 'text-ed-green'
                    : item.status === 'complete'
                      ? 'text-ed-orange'
                      : 'text-ed-muted'
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-ed-muted">
                {patient.name} · Bed {patient.bed}
              </span>
              <span className="text-[10px] text-ed-muted">
                {formatTimeAgo(item.orderedAt)}
              </span>
            </div>
            {isUnreadComplete && (
              <span
                className={`text-[10px] font-bold mt-0.5 block ${
                  urgency === 'emergency'
                    ? 'text-ed-red animate-flash-emergency'
                    : urgency === 'critical'
                      ? 'text-ed-red animate-flash-red'
                      : 'text-ed-orange animate-pulse-amber'
                }`}
                role="alert"
                aria-label={`${item.type} unread for more than ${Math.round(minutesSinceOrder)} minutes`}
              >
                ⚠ UNREAD {Math.round(minutesSinceOrder)}m
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LabsSection({ items }: { items: PendingItem<Lab>[] }) {
  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-ed-muted mb-2 px-3">
        Labs
      </h3>
      {items.length === 0 && (
        <p className="text-[11px] text-ed-muted px-3">No pending labs</p>
      )}
      {items.map(({ patient, item }) => (
        <div
          key={item.id}
          className={`px-3 py-2 border-b border-ed-border transition-all ${
            item.isCritical
              ? 'animate-flash-red border-l-4 border-l-ed-red bg-ed-red/10'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ed-text">
              {item.name}
            </span>
            {item.resultedAt ? (
              <span
                className={`text-[10px] font-bold ${
                  item.isCritical ? 'text-ed-red' : 'text-ed-green'
                }`}
              >
                {item.value}
              </span>
            ) : (
              <span className="text-[10px] text-ed-yellow">PENDING</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-ed-muted">
              {patient.name} · Bed {patient.bed}
            </span>
            <span className="text-[10px] text-ed-muted">
              {formatTimeAgo(item.orderedAt)}
            </span>
          </div>
          {item.isCritical && (
            <span
              className="text-[10px] font-bold text-ed-red mt-0.5 block"
              role="alert"
            >
              ⚠ CRITICAL
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function ConsultsSection({ items }: { items: PendingItem<Consult>[] }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-ed-muted mb-2 px-3">
        Consults
      </h3>
      {items.length === 0 && (
        <p className="text-[11px] text-ed-muted px-3">No active consults</p>
      )}
      {items.map(({ patient, item }) => (
        <div key={item.id} className="px-3 py-2 border-b border-ed-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ed-text">
              {item.specialty}
            </span>
            <span
              className={`text-[10px] ${
                item.status === 'seen'
                  ? 'text-ed-green'
                  : item.status === 'callback-received'
                    ? 'text-ed-teal'
                    : 'text-ed-orange'
              }`}
            >
              {item.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-ed-muted">
              {patient.name} · Bed {patient.bed}
            </span>
            <span className="text-[10px] text-ed-muted">
              Called {formatTimeAgo(item.calledAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Sidebar() {
  const patients = usePatientStore((s) => s.patients)
  const tickCount = usePatientStore((s) => s.tickCount)

  const { pendingImaging, pendingLabs, activeConsults } = useMemo(() => {
    const imaging: PendingItem<ImagingOrder>[] = []
    const labs: PendingItem<Lab>[] = []
    const consults: PendingItem<Consult>[] = []

    for (const patient of patients) {
      for (const img of patient.imaging) {
        if (img.status !== 'read') {
          imaging.push({ patient, item: img })
        }
      }
      for (const lab of patient.labs) {
        if (!lab.resultedAt || lab.isCritical) {
          labs.push({ patient, item: lab })
        }
      }
      for (const consult of patient.consults) {
        if (consult.status !== 'seen') {
          consults.push({ patient, item: consult })
        }
      }
    }

    imaging.sort((a, b) => a.item.orderedAt.getTime() - b.item.orderedAt.getTime())
    labs.sort((a, b) => {
      if (a.item.isCritical && !b.item.isCritical) return -1
      if (!a.item.isCritical && b.item.isCritical) return 1
      return a.item.orderedAt.getTime() - b.item.orderedAt.getTime()
    })

    return {
      pendingImaging: imaging,
      pendingLabs: labs,
      activeConsults: consults,
    }
  }, [patients, tickCount])

  return (
    <aside
      className="w-72 border-l border-ed-border bg-ed-surface overflow-y-auto flex-shrink-0"
      aria-label="Pending results"
    >
      <div className="px-3 py-3 border-b border-ed-border">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ed-teal">
          Pending Results
        </h2>
      </div>
      <div className="py-2">
        <ImagingSection items={pendingImaging} />
        <LabsSection items={pendingLabs} />
        <ConsultsSection items={activeConsults} />
      </div>
    </aside>
  )
}

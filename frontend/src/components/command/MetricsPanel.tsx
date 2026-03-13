import { useMemo } from 'react'
import { usePatientStore } from '@/store/patientStore'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const ESI_COLORS: Record<number, string> = {
  1: '#ff4444',
  2: '#ff8c00',
  3: '#ffd700',
  4: '#00ff88',
  5: '#4a5568',
}

export function MetricsPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const patients = usePatientStore((s) => s.patients)

  const esiDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    for (const p of patients) {
      if (p.esi >= 1 && p.esi <= 5) counts[p.esi - 1]++
    }
    return [
      { name: 'ESI 1', value: counts[0], fill: ESI_COLORS[1] },
      { name: 'ESI 2', value: counts[1], fill: ESI_COLORS[2] },
      { name: 'ESI 3', value: counts[2], fill: ESI_COLORS[3] },
      { name: 'ESI 4', value: counts[3], fill: ESI_COLORS[4] },
      { name: 'ESI 5', value: counts[4], fill: ESI_COLORS[5] },
    ].filter((d) => d.value > 0)
  }, [patients])

  const locationData = useMemo(() => {
    let bedded = 0
    let waiting = 0
    for (const p of patients) {
      if (p.bed === 'WR') waiting++
      else bedded++
    }
    return [
      { name: 'Bedded', count: bedded },
      { name: 'Waiting', count: waiting },
    ]
  }, [patients])

  const waitTimeData = useMemo(() => {
    const buckets = [
      { label: '<1h', count: 0 },
      { label: '1-2h', count: 0 },
      { label: '2-3h', count: 0 },
      { label: '3-4h', count: 0 },
      { label: '4h+', count: 0 },
    ]
    const now = Date.now()
    for (const p of patients) {
      const hours = (now - p.timeIn.getTime()) / 3_600_000
      if (hours < 1) buckets[0].count++
      else if (hours < 2) buckets[1].count++
      else if (hours < 3) buckets[2].count++
      else if (hours < 4) buckets[3].count++
      else buckets[4].count++
    }
    return buckets
  }, [patients])

  const pendingStats = useMemo(() => {
    let pendingLabs = 0
    let pendingImaging = 0
    let pendingConsults = 0
    let criticalLabs = 0
    for (const p of patients) {
      for (const l of p.labs) {
        if (!l.resultedAt) pendingLabs++
        if (l.isCritical) criticalLabs++
      }
      for (const img of p.imaging) {
        if (img.status !== 'read') pendingImaging++
      }
      for (const c of p.consults) {
        if (c.status !== 'seen') pendingConsults++
      }
    }
    return [
      { name: 'Pending Labs', count: pendingLabs },
      { name: 'Critical Labs', count: criticalLabs },
      { name: 'Unread Imaging', count: pendingImaging },
      { name: 'Open Consults', count: pendingConsults },
    ]
  }, [patients])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-labelledby="metrics-title">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-lg border border-ed-border bg-ed-bg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 id="metrics-title" className="text-sm font-bold uppercase tracking-wider text-ed-teal">
            ED Metrics Dashboard
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-ed-muted hover:text-ed-text hover:bg-white/5 transition-colors"
            aria-label="Close metrics"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* ESI Distribution */}
          <div className="rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3">ESI Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={esiDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {esiDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Patient Location */}
          <div className="rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3">Patient Location</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={locationData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wait Time Distribution */}
          <div className="rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3">Length of Stay</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={waitTimeData} barCategoryGap="20%">
                <XAxis dataKey="label" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#ff8c00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pending Work */}
          <div className="rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3">Pending Work</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pendingStats} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

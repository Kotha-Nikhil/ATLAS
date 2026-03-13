import { useMemo } from 'react'
import { usePatientStore } from '@/store/patientStore'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const ESI_COLORS: Record<number, string> = {
  1: '#ff4444',
  2: '#ff8c00',
  3: '#ffd700',
  4: '#00ff88',
  5: '#4a5568',
}

function generateHourlyVolume(): Array<{ hour: string; count: number; isCurrent: boolean }> {
  const now = new Date()
  const currentHour = now.getHours()

  return Array.from({ length: 24 }, (_, i) => {
    let base: number
    if (i >= 10 && i <= 14) base = 12 + Math.floor(Math.random() * 5)
    else if (i >= 18 && i <= 22) base = 14 + Math.floor(Math.random() * 6)
    else if (i >= 2 && i <= 6) base = 3 + Math.floor(Math.random() * 3)
    else base = 6 + Math.floor(Math.random() * 4)

    return {
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: base,
      isCurrent: i === currentHour,
    }
  })
}

function generateDoorToDoc(): Array<{ time: string; minutes: number }> {
  const now = Date.now()
  return Array.from({ length: 8 }, (_, i) => {
    const t = new Date(now - (7 - i) * 3_600_000)
    const base = 20 + Math.floor(Math.random() * 25)
    return {
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutes: base,
    }
  })
}

export function AnalyticsPanel({
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

  const hourlyVolume = useMemo(() => generateHourlyVolume(), [])
  const doorToDoc = useMemo(() => generateDoorToDoc(), [])

  const totalESI = esiDistribution.reduce((a, b) => a + b.value, 0)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-labelledby="analytics-title">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-ed-border bg-ed-bg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 id="analytics-title" className="text-sm font-bold uppercase tracking-wider text-ed-teal font-mono">
            ED Analytics
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-ed-muted hover:text-ed-text hover:bg-white/5 transition-colors"
            aria-label="Close analytics"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Patient Volume by Hour */}
          <div className="col-span-2 rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3 font-mono">Patient Volume by Hour</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyVolume} barCategoryGap="15%">
                <XAxis dataKey="hour" tick={{ fill: '#4a5568', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 11 }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {hourlyVolume.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isCurrent ? '#00d4aa' : '#1e1e2e'} stroke={entry.isCurrent ? '#00d4aa' : 'none'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ESI Distribution */}
          <div className="rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3 font-mono">ESI Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={esiDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${Math.round((value / totalESI) * 100)}%`}
                >
                  {esiDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Door-to-Doc Trend */}
          <div className="col-span-3 rounded border border-ed-border bg-ed-surface p-4">
            <h3 className="text-xs font-bold text-ed-muted uppercase mb-3 font-mono">Door-to-Doc Trend (Last 8 Hours)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={doorToDoc}>
                <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 11 }} formatter={(value: number) => [`${value} min`, 'Door-to-Doc']} />
                <ReferenceLine y={30} stroke="#00ff88" strokeDasharray="5 3" label={{ value: '30m target', fill: '#00ff88', fontSize: 10, position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="#00d4aa"
                  strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { minutes: number } }
                    const color = payload.minutes > 30 ? '#ff4444' : '#00ff88'
                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} stroke={color} />
                  }}
                  name="Minutes"
                />
                <Legend wrapperStyle={{ fontSize: 10, color: '#4a5568' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

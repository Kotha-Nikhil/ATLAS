import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Patient } from '@/types'

interface VitalSigns {
  time: string
  heartRate: number
  systolicBP: number
  diastolicBP: number
  o2Sat: number
  temperature: number
  respiratoryRate: number
}

function generateVitals(patient: Patient): VitalSigns[] {
  const isSepsis = patient.sepsisWatch
  const isACS = patient.riskFlags.some(
    (f) => f.label.includes('ACS') || f.label.includes('STEMI'),
  )
  const isHighRisk = patient.riskScore >= 70

  const points: VitalSigns[] = []
  const now = Date.now()

  for (let i = 11; i >= 0; i--) {
    const t = new Date(now - i * 10 * 60_000)
    const progress = (11 - i) / 11
    const jitter = () => (Math.random() - 0.5) * 4

    let hr: number, sbp: number, dbp: number, o2: number, temp: number, rr: number

    if (isSepsis) {
      hr = 110 + progress * 15 + jitter()
      sbp = 95 - progress * 10 + jitter()
      dbp = 60 - progress * 5 + jitter()
      o2 = 96 - progress * 3 + jitter()
      temp = 38.5 + progress * 0.4 + (Math.random() - 0.5) * 0.2
      rr = 22 + progress * 4 + jitter()
    } else if (isACS) {
      hr = 95 + progress * 10 + jitter()
      sbp = 150 + progress * 5 + jitter()
      dbp = 85 + progress * 3 + jitter()
      o2 = 94 - progress * 5 + jitter()
      temp = 37.0 + (Math.random() - 0.5) * 0.3
      rr = 18 + progress * 2 + jitter()
    } else if (isHighRisk) {
      hr = 90 + progress * 8 + jitter()
      sbp = 130 + jitter() * 2
      dbp = 75 + jitter()
      o2 = 95 - progress * 2 + jitter()
      temp = 37.2 + (Math.random() - 0.5) * 0.5
      rr = 16 + progress * 2 + jitter()
    } else {
      hr = 75 + jitter()
      sbp = 120 + jitter() * 2
      dbp = 78 + jitter()
      o2 = 98 + (Math.random() - 0.5) * 2
      temp = 36.8 + (Math.random() - 0.5) * 0.3
      rr = 14 + jitter()
    }

    points.push({
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      heartRate: Math.round(hr),
      systolicBP: Math.round(sbp),
      diastolicBP: Math.round(dbp),
      o2Sat: Math.round(Math.min(100, Math.max(80, o2))),
      temperature: Math.round(temp * 10) / 10,
      respiratoryRate: Math.round(rr),
    })
  }

  return points
}

export function VitalsChart({ patient }: { patient: Patient }) {
  const vitals = useMemo(() => generateVitals(patient), [patient.id])

  const latestVitals = vitals[vitals.length - 1]

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <VitalCard label="HR" value={`${latestVitals.heartRate}`} unit="bpm" danger={latestVitals.heartRate > 100 || latestVitals.heartRate < 60} />
        <VitalCard label="BP" value={`${latestVitals.systolicBP}/${latestVitals.diastolicBP}`} unit="mmHg" danger={latestVitals.systolicBP < 90 || latestVitals.systolicBP > 180} />
        <VitalCard label="O2" value={`${latestVitals.o2Sat}`} unit="%" danger={latestVitals.o2Sat < 94} />
        <VitalCard label="Temp" value={`${latestVitals.temperature}`} unit="°C" danger={latestVitals.temperature > 38.0} />
        <VitalCard label="RR" value={`${latestVitals.respiratoryRate}`} unit="/min" danger={latestVitals.respiratoryRate > 20} />
        <VitalCard label="Time" value="2h" unit="trend" danger={false} />
      </div>

      <div className="rounded border border-ed-border bg-ed-surface p-3 mb-3">
        <h4 className="text-[10px] font-bold uppercase text-ed-muted mb-2">Heart Rate & SpO2</h4>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={vitals}>
            <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 11 }} />
            <ReferenceLine y={100} stroke="#ff4444" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={60} stroke="#ff4444" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Line type="monotone" dataKey="heartRate" stroke="#ff4444" dot={false} strokeWidth={2} name="HR" />
            <Line type="monotone" dataKey="o2Sat" stroke="#00d4aa" dot={false} strokeWidth={2} name="SpO2" />
            <Legend wrapperStyle={{ fontSize: 10, color: '#4a5568' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded border border-ed-border bg-ed-surface p-3">
        <h4 className="text-[10px] font-bold uppercase text-ed-muted mb-2">Blood Pressure</h4>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={vitals}>
            <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#e2e8f0', fontSize: 11 }} />
            <ReferenceLine y={140} stroke="#ff8c00" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={90} stroke="#ff4444" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Line type="monotone" dataKey="systolicBP" stroke="#ff8c00" dot={false} strokeWidth={2} name="Systolic" />
            <Line type="monotone" dataKey="diastolicBP" stroke="#a855f7" dot={false} strokeWidth={1.5} name="Diastolic" />
            <Legend wrapperStyle={{ fontSize: 10, color: '#4a5568' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function VitalCard({ label, value, unit, danger }: { label: string; value: string; unit: string; danger: boolean }) {
  return (
    <div className={`rounded border px-2 py-1.5 text-center ${danger ? 'border-ed-red/50 bg-ed-red/5' : 'border-ed-border bg-ed-surface'}`}>
      <span className="text-[9px] text-ed-muted block">{label}</span>
      <span className={`text-sm font-bold font-mono ${danger ? 'text-ed-red' : 'text-ed-text'}`}>{value}</span>
      <span className="text-[8px] text-ed-muted ml-0.5">{unit}</span>
    </div>
  )
}

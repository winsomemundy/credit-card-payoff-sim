import type { SimulationResult } from '../engine/types'
import { formatDate } from '../utils/format'

interface Props { result: SimulationResult }

const CHART_W = 620
const CHART_H = 200
const PAD_L = 42
const PAD_T = 12
const PAD_B = 30

export function PayoffChart({ result }: Props) {
  const { schedule } = result
  const maxBalance = schedule[0].startingBalance
  const totalRows = schedule.length

  function xOf(i: number) {
    // i = 0 is "now" (before any payment), i = totalRows is the last payment
    return PAD_L + ((CHART_W - PAD_L) * i) / totalRows
  }

  function yOf(balance: number) {
    const usable = CHART_H - PAD_T - PAD_B
    return PAD_T + usable - (balance / maxBalance) * usable
  }

  // Build polyline: starting balance point + one point per row (ending balance)
  const polylinePoints: string[] = [
    `${xOf(0)},${yOf(maxBalance)}`,
    ...schedule.map((row, i) => `${xOf(i + 1)},${yOf(row.endingBalance)}`),
  ]
  const polyline = polylinePoints.join(' ')

  // Area fill polygon (close at the bottom)
  const areaPoints = [
    ...polylinePoints,
    `${xOf(totalRows)},${yOf(0)}`,
    `${xOf(0)},${yOf(0)}`,
  ].join(' ')

  const milestoneRows = schedule.filter(r => r.milestone && r.milestone !== '100%')
  const payoffRow = schedule[schedule.length - 1]

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: yOf(maxBalance * t),
    label: t === 0 ? '$0' : t === 1 ? `$${(maxBalance / 1000).toFixed(0)}k` : `$${((maxBalance * t) / 1000).toFixed(1)}k`,
    dashed: t !== 0,
  }))

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.15)', padding: '1.25rem', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#2C2C2A' }}>
          Progress to payoff
        </h4>
        <span style={{ fontSize: 13, color: '#5F5E5A' }}>Balance over time</span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Balance over time chart"
      >
        {/* Grid lines and Y labels */}
        {yLabels.map(({ y, label, dashed }, i) => (
          <g key={i}>
            <line
              x1={PAD_L} y1={y} x2={CHART_W} y2={y}
              stroke="#D3D1C7" strokeWidth={0.5}
              strokeDasharray={dashed ? '2,3' : undefined}
            />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#888780">
              {label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill="#EEEDFE" opacity={0.7} />

        {/* Balance curve */}
        <polyline points={polyline} fill="none" stroke="#534AB7" strokeWidth={2} />

        {/* Milestone vertical lines + circles */}
        {milestoneRows.map(row => {
          const cx = xOf(row.paymentNumber)
          const cy = yOf(row.endingBalance)
          return (
            <g key={row.milestone}>
              <line
                x1={cx} y1={PAD_T} x2={cx} y2={CHART_H - PAD_B}
                stroke="#1D9E75" strokeWidth={1} strokeDasharray="3,3"
              />
              <circle cx={cx} cy={cy} r={5} fill="#1D9E75" stroke="white" strokeWidth={2} />
              <text x={cx + 6} y={cy - 4} fontSize={11} fontWeight={500} fill="#0F6E56">
                {row.milestone}
              </text>
            </g>
          )
        })}

        {/* Payoff dot */}
        <circle
          cx={xOf(totalRows)} cy={yOf(0)} r={6}
          fill="#0F6E56" stroke="white" strokeWidth={2}
        />

        {/* X-axis labels */}
        <text x={PAD_L} y={CHART_H - 4} fontSize={10} fill="#888780">Now</text>
        <text x={CHART_W} y={CHART_H - 4} textAnchor="end" fontSize={10} fill="#888780">
          {formatDate(payoffRow.paymentDate)}
        </text>
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16,
        marginTop: 16, paddingTop: 12,
        borderTop: '0.5px solid rgba(0,0,0,0.15)',
      }}>
        {(['25%', '50%', '75%', '100%'] as const).map(flag => {
          const m = result.milestones[flag]
          const color = flag === '100%' ? '#0F6E56' : '#1D9E75'
          return (
            <div key={flag} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: color, display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, color: '#5F5E5A' }}>
                {flag} reached: {formatDate(m.date)}
                {m.joint && ` (with ${m.joint})`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

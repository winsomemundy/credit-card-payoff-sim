import type { SimulationResult } from '../engine/types'
import { formatDate } from '../utils/format'

interface Props { result: SimulationResult }

const CHART_W = 620
const CHART_H = 200
const PAD_L = 42
const PAD_T = 12
const PAD_B = 30
const PAD_R = 10 // room for the payoff marker at the right edge

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

  // Milestones and the payoff point are diamonds, the site's marker motif
  const diamond = (cx: number, cy: number, r: number) =>
    `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`

  return (
    <div className="wm-card">
      <div className="wm-card__head">
        <h2 className="wm-card__title heading-sm">Progress to payoff</h2>
        <span className="wm-muted" style={{ fontSize: '0.85rem' }}>Balance over time</span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W + PAD_R} ${CHART_H}`}
        className="cc-chart"
        aria-label="Balance over time chart"
      >
        {/* Grid lines and Y labels */}
        {yLabels.map(({ y, label, dashed }, i) => (
          <g key={i}>
            <line
              x1={PAD_L} y1={y} x2={CHART_W} y2={y}
              className="cc-chart__grid"
              strokeDasharray={dashed ? '2,3' : undefined}
            />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" className="cc-chart__axis">
              {label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} className="cc-chart__area" />

        {/* Balance curve */}
        <polyline points={polyline} className="cc-chart__line" />

        {/* Milestone vertical lines + markers */}
        {milestoneRows.map(row => {
          const cx = xOf(row.paymentNumber)
          const cy = yOf(row.endingBalance)
          return (
            <g key={row.milestone}>
              <line x1={cx} y1={PAD_T} x2={cx} y2={CHART_H - PAD_B} className="cc-chart__milestone-line" />
              <polygon points={diamond(cx, cy, 6)} className="cc-chart__milestone" />
              <text x={cx + 8} y={cy - 6} className="cc-chart__milestone-label">
                {row.milestone}
              </text>
            </g>
          )
        })}

        {/* Payoff marker */}
        <polygon points={diamond(xOf(totalRows), yOf(0), 7)} className="cc-chart__payoff" />

        {/* X-axis labels */}
        <text x={PAD_L} y={CHART_H - 4} className="cc-chart__axis">Now</text>
        <text x={CHART_W} y={CHART_H - 4} textAnchor="end" className="cc-chart__axis">
          {formatDate(payoffRow.paymentDate)}
        </text>
      </svg>

      {/* Legend */}
      <div className="cc-legend">
        {(['25%', '50%', '75%', '100%'] as const).map(flag => {
          const m = result.milestones[flag]
          return (
            <div key={flag} className="cc-milestone">
              <span className={flag === '100%' ? 'cc-diamond cc-diamond--payoff' : 'cc-diamond'} />
              <span>
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

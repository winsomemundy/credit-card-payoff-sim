import type { ScheduleRow } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { rows: ScheduleRow[] }

export function ScheduleTable({ rows }: Props) {
  return (
    <div className="wm-card">
      <h2 className="wm-card__title heading-sm" id="schedule-title">Payment schedule</h2>
      {/* Focusable so keyboard users can scroll the table sideways on narrow screens */}
      <div className="wm-table-scroll" tabIndex={0} role="region" aria-labelledby="schedule-title">
        <table className="wm-table">
          <caption className="wm-sr-only">Payment schedule, one row per monthly payment</caption>
          <thead>
            <tr>
              <th className="wm-left">#</th>
              <th className="wm-left">Date</th>
              <th>Balance</th>
              <th>Payment</th>
              <th>Interest</th>
              <th>Principal</th>
              <th>Ending</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isMilestone = row.milestone !== null && row.milestone !== '100%'
              const isPayoff = row.milestone === '100%'
              const rowClass = isPayoff ? 'wm-row--final' : isMilestone ? 'wm-row--milestone' : undefined

              return (
                <tr key={row.paymentNumber} className={rowClass}>
                  <td className="wm-left wm-dim">{row.paymentNumber}</td>
                  <td className="wm-left">
                    {formatDate(row.paymentDate)}
                    {row.milestone && (
                      <span className={isPayoff ? 'wm-pill wm-pill--final' : 'wm-pill'}>
                        {row.milestone}
                      </span>
                    )}
                  </td>
                  <td>{formatCurrency(row.startingBalance)}</td>
                  <td>{formatCurrency(row.paymentAmount)}</td>
                  <td className="wm-dim">{formatCurrency(row.interestAccrued)}</td>
                  <td>{formatCurrency(row.principalPaid)}</td>
                  <td className="wm-strong">{formatCurrency(row.endingBalance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

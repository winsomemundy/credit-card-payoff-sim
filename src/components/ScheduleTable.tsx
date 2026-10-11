import type { ScheduleRow } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { rows: ScheduleRow[] }

export function ScheduleTable({ rows }: Props) {
  return (
    <div className="wm-card">
      <h2 className="wm-card__title heading-sm">Payment schedule</h2>
      <div className="cc-table-scroll">
        <table className="cc-table">
          <thead>
            <tr>
              <th className="cc-left">#</th>
              <th className="cc-left">Date</th>
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
              const rowClass = isPayoff ? 'cc-row--payoff' : isMilestone ? 'cc-row--milestone' : undefined

              return (
                <tr key={row.paymentNumber} className={rowClass}>
                  <td className="cc-left cc-dim">{row.paymentNumber}</td>
                  <td className="cc-left">
                    {formatDate(row.paymentDate)}
                    {row.milestone && (
                      <span className={isPayoff ? 'cc-pill cc-pill--payoff' : 'cc-pill'}>
                        {row.milestone}
                      </span>
                    )}
                  </td>
                  <td>{formatCurrency(row.startingBalance)}</td>
                  <td>{formatCurrency(row.paymentAmount)}</td>
                  <td className="cc-dim">{formatCurrency(row.interestAccrued)}</td>
                  <td>{formatCurrency(row.principalPaid)}</td>
                  <td className="cc-strong">{formatCurrency(row.endingBalance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

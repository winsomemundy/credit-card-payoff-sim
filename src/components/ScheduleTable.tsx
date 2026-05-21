import type { ScheduleRow } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { rows: ScheduleRow[] }

export function ScheduleTable({ rows }: Props) {
  const thStyle: React.CSSProperties = {
    textAlign: 'right', padding: '8px 4px', fontWeight: 500, color: '#5F5E5A', fontSize: 13,
  }
  const thLeftStyle: React.CSSProperties = { ...thStyle, textAlign: 'left' }

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.15)', padding: '1.25rem',
    }}>
      <h4 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px', color: '#2C2C2A' }}>
        Payment schedule
      </h4>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.3)' }}>
            <th style={thLeftStyle}>#</th>
            <th style={thLeftStyle}>Date</th>
            <th style={thStyle}>Balance</th>
            <th style={thStyle}>Payment</th>
            <th style={thStyle}>Interest</th>
            <th style={thStyle}>Principal</th>
            <th style={thStyle}>Ending</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isMilestone = row.milestone !== null && row.milestone !== '100%'
            const isPayoff = row.milestone === '100%'
            const bg = isPayoff ? '#EEEDFE' : isMilestone ? '#E1F5EE' : 'transparent'
            const textColor = isPayoff ? '#26215C' : isMilestone ? '#04342C' : '#2C2C2A'
            const accentColor = isPayoff ? '#534AB7' : isMilestone ? '#0F6E56' : '#5F5E5A'
            const pillBg = isPayoff ? '#534AB7' : '#1D9E75'

            const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
              padding: '8px 4px',
              borderBottom: '0.5px solid rgba(0,0,0,0.15)',
              color: textColor,
              ...extra,
            })

            return (
              <tr key={row.paymentNumber} style={{ background: bg }}>
                <td style={tdStyle({ color: accentColor })}>{row.paymentNumber}</td>
                <td style={tdStyle()}>
                  {formatDate(row.paymentDate)}
                  {row.milestone && (
                    <span style={{
                      background: pillBg, color: 'white', fontSize: 11,
                      padding: '2px 8px', borderRadius: 10, marginLeft: 4,
                      whiteSpace: 'nowrap',
                    }}>
                      {row.milestone}
                    </span>
                  )}
                </td>
                <td style={tdStyle({ textAlign: 'right' })}>{formatCurrency(row.startingBalance)}</td>
                <td style={tdStyle({ textAlign: 'right' })}>{formatCurrency(row.paymentAmount)}</td>
                <td style={tdStyle({ textAlign: 'right', color: accentColor })}>
                  {formatCurrency(row.interestAccrued)}
                </td>
                <td style={tdStyle({ textAlign: 'right' })}>{formatCurrency(row.principalPaid)}</td>
                <td style={tdStyle({ textAlign: 'right', fontWeight: 500 })}>
                  {formatCurrency(row.endingBalance)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

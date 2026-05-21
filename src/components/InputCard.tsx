import { useState } from 'react'
import type { SimulationParams, PayoffMode } from '../engine/types'

interface Props {
  onSubmit: (params: SimulationParams) => void
}

export function InputCard({ onSubmit }: Props) {
  const today = new Date()
  const [balance, setBalance] = useState('5000')
  const [apr, setApr] = useState('18')
  const [dueDay, setDueDay] = useState('15')
  const [mode, setMode] = useState<PayoffMode>('fixed_payment')
  const [payment, setPayment] = useState('150')
  const [months, setMonths] = useState('36')
  const [newCharges, setNewCharges] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params: SimulationParams = {
      startingBalance: parseFloat(balance),
      apr: parseFloat(apr),
      startDate: today,
      dueDayOfMonth: parseInt(dueDay, 10),
      mode,
      monthlyPayment: mode === 'fixed_payment' ? parseFloat(payment) : undefined,
      numberOfMonths: mode === 'fixed_months' ? parseInt(months, 10) : undefined,
      newMonthlyCharges: parseFloat(newCharges || '0'),
    }
    onSubmit(params)
  }

  const inputStyle: React.CSSProperties = {
    border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8,
    padding: '8px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box',
    background: 'white', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6,
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'white', borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.15)', padding: '1.25rem', marginBottom: '1.5rem',
    }}>
      <h4 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px', color: '#2C2C2A' }}>
        Your debt
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Current balance</label>
          <input
            style={inputStyle} type="number" min="0.01" step="0.01" value={balance}
            onChange={e => setBalance(e.target.value)} required
          />
        </div>
        <div>
          <label style={labelStyle}>Annual interest rate (%)</label>
          <input
            style={inputStyle} type="number" min="0" max="50" step="0.01" value={apr}
            onChange={e => setApr(e.target.value)} required
          />
        </div>
        <div>
          <label style={labelStyle}>Payment due day</label>
          <input
            style={inputStyle} type="number" min="1" max="31" value={dueDay}
            onChange={e => setDueDay(e.target.value)} required
          />
        </div>
      </div>

      <h4 style={{ fontSize: 16, fontWeight: 500, margin: '8px 0 12px', color: '#2C2C2A' }}>
        Payoff plan
      </h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['fixed_payment', 'fixed_months'] as PayoffMode[]).map(m => (
          <button
            key={m} type="button" onClick={() => setMode(m)}
            style={{
              flex: 1, borderRadius: 8, padding: 8, textAlign: 'center',
              fontSize: 14, cursor: 'pointer', transition: 'none',
              background: mode === m ? '#EEEDFE' : 'transparent',
              color: mode === m ? '#26215C' : '#5F5E5A',
              border: mode === m ? '0.5px solid #7F77DD' : '0.5px solid rgba(0,0,0,0.15)',
            }}
          >
            {m === 'fixed_payment' ? 'Fixed monthly payment' : 'Target number of months'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {mode === 'fixed_payment' ? (
          <div>
            <label style={labelStyle}>Monthly payment ($)</label>
            <input
              style={inputStyle} type="number" min="0.01" step="0.01" value={payment}
              onChange={e => setPayment(e.target.value)} required
            />
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Number of months</label>
            <input
              style={inputStyle} type="number" min="1" value={months}
              onChange={e => setMonths(e.target.value)} required
            />
          </div>
        )}
        <div>
          <label style={labelStyle}>Assumed new monthly charges (optional)</label>
          <input
            style={inputStyle} type="number" min="0" step="0.01"
            placeholder="$0.00" value={newCharges}
            onChange={e => setNewCharges(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        style={{
          marginTop: 16, width: '100%', padding: '10px',
          borderRadius: 8, background: '#534AB7', color: 'white',
          border: 'none', fontSize: 15, cursor: 'pointer', fontWeight: 500,
        }}
      >
        Calculate
      </button>
    </form>
  )
}

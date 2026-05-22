// src/components/MinPaymentExplainer.tsx
import { useState } from 'react'
import type { SimulationResult } from '../engine/types'
import { formatCurrency } from '../utils/format'

interface Props {
  result: SimulationResult
}

export function MinPaymentExplainer({ result }: Props) {
  const [open, setOpen] = useState(false)

  const row = result.schedule[0]
  const onePercent = Math.round(row.startingBalance * 0.01 * 100) / 100
  const minPayment = Math.max(25, Math.round((onePercent + row.interestAccrued) * 100) / 100)

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Toggle link */}
      <div style={{ textAlign: 'right', padding: '2px 4px 0' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 12,
            color: '#1D9E75',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          How is the minimum payment calculated? {open ? '▴' : '▾'}
        </button>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{
          marginTop: 6,
          background: 'white',
          border: '0.5px solid #a8dfc8',
          borderRadius: 10,
          padding: '1rem 1.25rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem',
        }}>
          {/* Left: formula */}
          <div>
            <div data-testid="formula-section" style={{
              fontSize: 11, color: '#5F5E5A',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
            }}>
              Formula
            </div>
            <div style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.6, marginBottom: 8 }}>
              Each month, the minimum is the <em>greater</em> of:
            </div>
            <div style={{
              background: '#f0faf6', borderRadius: 8, padding: '8px 10px',
              fontSize: 12, fontFamily: 'monospace', color: '#04342C', lineHeight: 1.8,
            }}>
              $25 floor<br />
              <span style={{ color: '#0F6E56', fontWeight: 600 }}>— or —</span><br />
              1% × balance<br />
              + monthly interest
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#5F5E5A' }}>
              Standard practice used by major US credit card issuers.
            </div>
          </div>

          {/* Right: live numbers */}
          <div>
            <div style={{
              fontSize: 11, color: '#5F5E5A',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
            }}>
              Your first payment
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 10 }}>
              Based on your {formatCurrency(row.startingBalance)} opening balance
            </div>
            <div style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5F5E5A' }}>1% × {formatCurrency(row.startingBalance)}</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(onePercent)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5F5E5A' }}>+ interest</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(row.interestAccrued)}</span>
              </div>
              <div style={{
                borderTop: '0.5px solid #a8dfc8', marginTop: 4, paddingTop: 6,
                display: 'flex', justifyContent: 'space-between',
                fontWeight: 600, color: '#0F6E56',
              }}>
                <span>Min payment</span>
                <span>{formatCurrency(minPayment)}</span>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#5F5E5A' }}>
              Decreases each month as your balance falls.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

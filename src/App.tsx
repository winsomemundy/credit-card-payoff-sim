import { useState } from 'react'
import { runSimulation, isValidationError } from './engine'
import type { SimulationParams, SimulationResult, ValidationError } from './engine/types'
import { InputCard } from './components/InputCard'
import { MetricStrip } from './components/MetricStrip'
import { InterestSavedCallout } from './components/InterestSavedCallout'
import { MinPaymentExplainer } from './components/MinPaymentExplainer'
import { PayoffChart } from './components/PayoffChart'
import { ScheduleTable } from './components/ScheduleTable'
import { SummaryBlock } from './components/SummaryBlock'

export default function App() {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<ValidationError | null>(null)

  function handleSubmit(params: SimulationParams) {
    const output = runSimulation(params)
    if (isValidationError(output)) {
      setError(output)
      setResult(null)
    } else {
      setError(null)
      setResult(output)
    }
  }

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 760,
      margin: '0 auto',
      padding: '2rem 1rem',
      color: '#2C2C2A',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: '#2C2C2A' }}>
          Credit card payoff simulator
        </h3>
        <p style={{ fontSize: 14, color: '#5F5E5A', margin: 0 }}>
          See your full path to a zero balance.
        </p>
      </div>

      {/* Input form */}
      <InputCard onSubmit={handleSubmit} />

      {/* Validation error */}
      {error && (
        <div style={{
          background: '#FFF0F0',
          border: '0.5px solid #E57373',
          borderRadius: 8,
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          color: '#B71C1C',
          fontSize: 14,
        }}>
          Payment too low — balance would grow indefinitely. Minimum to make progress:{' '}
          <strong>${error.minViablePayment.toFixed(2)}</strong>.
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Low payment warning (fixed_months mode) */}
          {result.lowPaymentWarning && (
            <div style={{
              background: '#FFFDE7',
              border: '0.5px solid #F9A825',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: 14,
              color: '#5F4000',
            }}>
              Note: the derived monthly payment is less than $25. The schedule is shown below,
              but consider increasing your payment target.
            </div>
          )}

          <InterestSavedCallout result={result} />
          <MinPaymentExplainer result={result} />
          <MetricStrip result={result} />
          <PayoffChart result={result} />
          <SummaryBlock result={result} />
          <ScheduleTable rows={result.schedule} />
        </>
      )}
    </div>
  )
}

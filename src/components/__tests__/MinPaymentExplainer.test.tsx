// src/components/__tests__/MinPaymentExplainer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { SimulationResult } from '../../engine/types'
import { MinPaymentExplainer } from '../MinPaymentExplainer'

// Minimal SimulationResult with only the fields MinPaymentExplainer uses.
function makeResult(
  startingBalance: number,
  interestAccrued: number,
): SimulationResult {
  return {
    schedule: [
      {
        paymentNumber: 1,
        paymentDate: new Date(2026, 5, 15),
        startingBalance,
        interestAccrued,
        paymentAmount: 150,
        principalPaid: 150 - interestAccrued,
        endingBalance: startingBalance - (150 - interestAccrued),
        milestone: null,
      },
    ],
    totalMonths: 47,
    totalAmountPaid: 7028,
    totalInterestPaid: 2028,
    effectivePayoffDate: new Date(2030, 3, 15),
    milestones: {
      '25%': { date: new Date() },
      '50%': { date: new Date() },
      '75%': { date: new Date() },
      '100%': { date: new Date() },
    },
  }
}

describe('MinPaymentExplainer', () => {
  it('renders the toggle button collapsed by default', () => {
    render(<MinPaymentExplainer result={makeResult(5000, 75)} />)
    expect(screen.getByRole('button', { name: /how is the minimum payment calculated/i })).toBeInTheDocument()
    expect(screen.queryByText(/formula/i)).not.toBeInTheDocument()
  })

  it('shows the panel when the toggle is clicked', () => {
    render(<MinPaymentExplainer result={makeResult(5000, 75)} />)
    fireEvent.click(screen.getByRole('button', { name: /how is the minimum payment calculated/i }))
    expect(screen.getByText(/formula/i)).toBeInTheDocument()
    expect(screen.getByText(/your first payment/i)).toBeInTheDocument()
  })

  it('hides the panel when the toggle is clicked a second time', () => {
    render(<MinPaymentExplainer result={makeResult(5000, 75)} />)
    const btn = screen.getByRole('button', { name: /how is the minimum payment calculated/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText(/formula/i)).not.toBeInTheDocument()
  })

  it('displays correct live numbers: $5,000 balance, $75 interest → min $125.00', () => {
    render(<MinPaymentExplainer result={makeResult(5000, 75)} />)
    fireEvent.click(screen.getByRole('button', { name: /how is the minimum payment calculated/i }))
    // 1% × $5,000 = $50.00
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    // interest
    expect(screen.getByText('$75.00')).toBeInTheDocument()
    // min payment = max(25, 50 + 75) = $125.00
    expect(screen.getByText('$125.00')).toBeInTheDocument()
  })

  it('applies $25 floor when 1% + interest is less than $25', () => {
    // $1,000 balance, $1.50 interest → 1%=$10 + $1.50 = $11.50 < $25 → floor applies
    render(<MinPaymentExplainer result={makeResult(1000, 1.5)} />)
    fireEvent.click(screen.getByRole('button', { name: /how is the minimum payment calculated/i }))
    expect(screen.getByText('$25.00')).toBeInTheDocument()
  })

  it('shows $0.00 interest when APR is 0', () => {
    // $5,000 balance, $0 interest → 1%=$50 + $0 = $50 → min $50.00
    // Note: $50.00 appears twice (1% component row + min payment row), so use getAllByText
    render(<MinPaymentExplainer result={makeResult(5000, 0)} />)
    fireEvent.click(screen.getByRole('button', { name: /how is the minimum payment calculated/i }))
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getAllByText('$50.00')).toHaveLength(2)
  })
})

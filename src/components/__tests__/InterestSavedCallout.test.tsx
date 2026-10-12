import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { SimulationResult } from '../../engine/types'
import { InterestSavedCallout } from '../InterestSavedCallout'

const base: SimulationResult = {
  schedule: [],
  totalMonths: 554,
  totalAmountPaid: 41560.5,
  totalInterestPaid: 36560.5,
  effectivePayoffDate: new Date(2073, 0, 15),
  milestones: { '25%': {}, '50%': {}, '75%': {}, '100%': {} },
}

describe('InterestSavedCallout', () => {
  it('states the extra cost when the plan costs more than the minimum', () => {
    render(<InterestSavedCallout result={{ ...base, extraInterest: 30021.87, extraMonths: 332 }} />)
    expect(screen.getByText(/\$30,021\.87 more in interest/)).toBeInTheDocument()
    expect(screen.getByText(/332 months longer/)).toBeInTheDocument()
  })

  it('states the savings when the plan beats the minimum', () => {
    render(<InterestSavedCallout result={{ ...base, interestSaved: 4555.02, monthsSaved: 175 }} />)
    expect(screen.getByText(/\$4,555\.02 in interest/)).toBeInTheDocument()
  })

  it('renders nothing when there is neither saving nor extra cost', () => {
    const { container } = render(<InterestSavedCallout result={base} />)
    expect(container).toBeEmptyDOMElement()
  })
})

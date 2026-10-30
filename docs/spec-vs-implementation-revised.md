# Spec vs. Implementation — Product Signoff Document

**Spec version:** 1.0 (Final)  
**Reviewed against:** codebase as of May 21, 2026  
**Test suite:** 96/96 passing (`npm test`)  
**Reviewer:** Claude Code

---

## Summary

The implementation faithfully covers every requirement in the spec. Two items deviate from the literal spec in ways worth calling out explicitly for product sign-off. Scope also expanded into §10 ("Future Enhancements"): three items listed there as non-blocking shipped in this version. None of the §9 ("Out of Scope") exclusions were added.

| Section | Status |
|---------|--------|
| §2 Inputs | ✅ All fields implemented — one deliberate narrowing (start date not user-editable; see §Deviations) |
| §3 Interest Calculation | ✅ Exact match |
| §4 Validation Rules | ✅ Exact match |
| §5 Output Schedule | ✅ All 8 row fields; visual treatment implemented |
| §6 Progress Milestones | ✅ All rules including tie-breaker and joint annotation |
| §7 Summary Block | ✅ All 5 required stats + milestone dates with annotations |
| §8 Edge Cases | ✅ All 3 explicitly handled |
| §9 Out of Scope | ✅ None of the excluded features are present |
| Appendix A calc logic | ✅ Matches spec exactly |

---

## Section-by-Section Detail

### §2 Inputs

| Field | Spec Constraint | Implementation | Status |
|-------|-----------------|----------------|--------|
| Current balance | Positive USD, 2dp | `startingBalance: number`; `<input type="number" min="0.01" step="0.01">` | ✅ |
| APR | 0–50 | `apr: number`; `<input min="0" max="50" step="0.01">` | ✅ |
| Start date | Optional; defaults to today | Hardcoded to `new Date()` at form submission — no date picker exposed | ⚠️ See Deviations |
| Payment due day | 1–31; short months use last day | `dueDayOfMonth: number`; `<input min="1" max="31">`; `adjustForShortMonth` handles short months | ✅ |
| Payoff mode | Enum: `fixed_months` \| `fixed_payment` | `PayoffMode` type; toggle buttons | ✅ |
| Number of months | Required when `fixed_months`; positive | `numberOfMonths?: number`; `<input min="1">` shown conditionally | ✅ |
| Monthly payment | Required when `fixed_payment`; positive | `monthlyPayment?: number`; `<input min="0.01" step="0.01">` shown conditionally | ✅ |
| New monthly charges | Optional; defaults to $0 | `newMonthlyCharges: number`; placeholder `$0.00`; parsed as `0` when blank | ✅ |

---

### §3 Interest Calculation

| Rule | Spec | Implementation (`calculator.ts`) | Status |
|------|------|-----------------------------------|--------|
| Monthly rate | `APR / 100 / 12` | `const monthlyRate = params.apr / 100 / 12` | ✅ |
| Interest timing | Accrues once per cycle, day before due | `interest = roundHalfUp(balance * monthlyRate)` at top of each loop iteration | ✅ |
| New charges added before payment | Implicit in Step A | `balanceAfterInterest = balance + interest + params.newMonthlyCharges` | ✅ |
| Payment split | Interest first, then principal | `interestPortion = Math.min(actualPayment, interest)`; `principalPaid = actualPayment - interestPortion` | ✅ |
| APR = 0 | Skip interest math entirely | `monthlyRate = 0` → `interest = 0`; all downstream values correct | ✅ |

---

### §4 Validation Rules

#### Fixed payment mode

| Rule | Spec | Implementation | Status |
|------|------|----------------|--------|
| Reject if payment ≤ first-month interest | Hard rejection | `validateParams` returns `{ type: 'payment_too_low', minViablePayment }` | ✅ |
| Error message | "Payment too low — balance would grow indefinitely. Minimum to make progress: $X.XX." | Exact match in `App.tsx` lines 59–61 | ✅ |
| Min viable amount | `round_up(first_month_interest + 0.01, 2)` | `Math.round((firstMonthInterest + 0.01) * 100) / 100` — functionally equivalent since `firstMonthInterest` is already 2dp | ✅ |

#### Fixed months mode

| Rule | Spec | Implementation | Status |
|------|------|----------------|--------|
| Warn if derived payment < $25 | Warn, still produce schedule | `lowPaymentWarning: boolean` set in `deriveMonthlyPayment`; yellow banner in `App.tsx` lines 68–81 | ✅ |
| Warning text | Not prescribed verbatim | "Note: the derived monthly payment is less than $25. The schedule is shown below, but consider increasing your payment target." — clear and appropriate | ✅ |

---

### §5 Output Schedule

#### Row fields (all 8 required)

| # | Field | Spec name | Type field | Status |
|---|-------|-----------|------------|--------|
| 1 | Payment number | `paymentNumber` | `number` | ✅ |
| 2 | Payment date | `paymentDate` | `Date` | ✅ |
| 3 | Starting balance | `startingBalance` | `number` | ✅ |
| 4 | Interest accrued | `interestAccrued` | `number` | ✅ |
| 5 | Payment amount | `paymentAmount` | `number` | ✅ |
| 6 | Principal paid | `principalPaid` | `number` | ✅ |
| 7 | Ending balance | `endingBalance` | `number` | ✅ |
| 8 | Milestone flag | `milestone: MilestoneFlag` | `'25%' \| '50%' \| '75%' \| '100%' \| null` | ✅ |

#### Visual treatment

| Spec requirement | Implementation (`ScheduleTable.tsx`) | Status |
|-----------------|--------------------------------------|--------|
| Milestone rows visually distinct | Teal background (`#E1F5EE`) + teal text on 25/50/75% rows | ✅ |
| 100% row distinct | Purple background (`#EEEDFE`) + purple text | ✅ |
| Milestone label in row | Pill badge (`<span>` with rounded background) inline with the date | ✅ |

---

### §6 Progress Milestones

| Rule | Spec | Implementation | Status |
|------|------|----------------|--------|
| Milestone anchors | Percent of **original starting balance** | `threshold25/50/75 = params.startingBalance * 0.25/0.50/0.75` — locked at loop start | ✅ |
| Trigger: cumulative **principal** paid | Not total paid | `cumulativePrincipal` accumulates `principalPaid` only (excludes interest) | ✅ |
| Only highest milestone flagged per row | Tie-breaker rule | `checkMilestone` checks 100% → 75% → 50% → 25% in order; returns on first hit | ✅ |
| Skipped milestone dates backfilled | Lower milestones get the higher milestone's date | `checkMilestone` sets `hit50/25` + stores date when 75% is hit; same pattern for 50% jumping 25% | ✅ |
| Joint annotation stored | `milestone_50_joint = "75%"` etc. | `joint50?: MilestoneFlag`, `joint25?: MilestoneFlag` on `MilestoneState` | ✅ |
| Joint annotation displayed | "reached together with X%" | `SummaryBlock.tsx` line 30: `(reached together with {m.joint})` | ✅ |
| New charges note | Note explaining charges extend payoff | `newChargesNote: boolean` → displayed in `SummaryBlock.tsx` | ✅ |
| 100% backfill edge case | If balance zeroes before lower milestones are hit | `checkMilestone` backfills 75/50/25 with `100%` as joint annotation | ✅ |

---

### §7 Summary Block

The spec requires these 5 items alongside the schedule. All appear in `MetricStrip` and `SummaryBlock`:

| Required stat | Component | Status |
|---------------|-----------|--------|
| Total months to payoff | `MetricStrip` — "Time to payoff: N months" | ✅ |
| Total amount paid | `MetricStrip` — "Total paid: $X,XXX.XX" | ✅ |
| Total interest paid | `MetricStrip` — "Interest paid: $X,XXX.XX" | ✅ |
| Effective payoff date | `MetricStrip` — "Payoff date: Mon DD, YYYY" | ✅ |
| Milestone dates (all 4) with joint annotations | `SummaryBlock` — iterates all four flags; shows joint note when `m.joint` is set | ✅ |

---

### §8 Edge Cases

| Edge case | Spec | Implementation | Status |
|-----------|------|----------------|--------|
| Final payment auto-reduced | Never overpay; pay exact remaining balance | `actualPayment = balanceAfterInterest` when `balanceAfterInterest <= monthlyPayment` | ✅ |
| Start date after due day | First payment shifts to next month | `firstPaymentDate`: `if (day <= dueDayOfMonth)` → same month, else next month | ✅ |
| Short months (e.g. due day 31 in Feb) | Use last day of month | `adjustForShortMonth(year, month, dueDay)` → `Math.min(dueDay, daysInMonth(...))` | ✅ |
| Safety cap | 600 iterations max | `for (let n = 1; n <= SAFETY_CAP; n++)` where `SAFETY_CAP = 600` | ✅ |
| Balance treated as zero | `≤ 0.005` (within half a cent) | `const isLast = rawEndingBalance <= 0.005` | ✅ |

---

### §9 Out of Scope (confirmed absent)

None of the following are present in the implementation:

- Variable APR or promotional rate expiration
- Late fees, over-limit fees, cash advance APR
- Weekend/holiday date shifting
- Multiple cards or balance transfers
- Lump-sum extra payments

---

### Appendix A — Calculation Logic Verification

#### A.1 Setup

| Rule | Spec | Implementation | Status |
|------|------|----------------|--------|
| Monthly rate | `APR / 100 / 12` | Exact | ✅ |
| First payment date logic | `day <= due_day` → same month; else next month | `firstPaymentDate` in `dates.ts` | ✅ |
| Short-month adjustment | `min(due_day, days_in_month)` | `adjustForShortMonth` | ✅ |
| Milestone dollar thresholds | Locked at start to `balance × 0.25/0.50/0.75` | `ms.threshold25/50/75` set before loop | ✅ |

#### A.2 Mode-specific setup

| Rule | Spec | Implementation | Status |
|------|------|----------------|--------|
| APR=0 payment formula | `starting_balance / num_months` | `monthlyRate === 0` branch in `deriveMonthlyPayment` | ✅ |
| Standard amortization formula | `balance × (r(1+r)^n) / ((1+r)^n - 1)` | Exact formula in `amortization.ts` lines 17–20 | ✅ |
| New charges in fixed_months | `payment = balance × factor + new_charges` | `payment = startingBalance * factor + newMonthlyCharges` | ✅ |
| **Ceil to nearest cent** | `round_up` to prevent drift | `Math.ceil(payment * 100) / 100` — **note: ceil, not round** | ✅ |

#### A.3 Main loop steps

| Step | Spec | Implementation | Status |
|------|------|----------------|--------|
| A — Interest | `interest = round(balance × rate, 2)` | `roundHalfUp(balance * monthlyRate)` | ✅ |
| A — New charges | Added to `balance_after_interest` | `balance + interest + params.newMonthlyCharges` | ✅ |
| B — Final payment | `if scheduled >= balance_after, pay balance_after` | Ternary: `balanceAfterInterest <= monthlyPayment ? balanceAfterInterest : monthlyPayment` | ✅ |
| C — Payment split | Interest first, then principal | `interestPortion = Math.min(actualPayment, interest)` | ✅ |
| D — Running totals | Accumulate `cumulativePrincipal` in full precision | Accumulated before `roundHalfUp` applied to row display | ✅ |
| E — Milestone flag | Highest reached only; backfill lower | `checkMilestone` function — exact spec logic | ✅ |
| F — Next date | `add_one_month` + `adjust_for_short_month` | `nextPaymentDate` in `dates.ts` | ✅ |

#### A.5 Rounding

| Rule | Spec | Implementation | Status |
|------|------|----------------|--------|
| Round to 2dp per row | At storage time | `roundHalfUp` applied to `startingBalance`, `paymentAmount`, `principalPaid`, `endingBalance` | ✅ |
| Rounding method | Half-up or banker's (pick one, apply consistently) | `Math.round(value * 100) / 100` — standard half-up, consistent throughout | ✅ |
| Full precision for running totals | Keep during loop | `cumulativePrincipal` and `balance` carried at full JS precision | ✅ |

#### A.6 Sanity check ($5,000 / 18% APR / $150/month)

| Expected | Verified by | Status |
|----------|-------------|--------|
| Month 1 interest: $75.00 | `calculator.test.ts` | ✅ |
| Month 1 principal: $75.00, ending: $4,925.00 | `calculator.test.ts` | ✅ |
| Total months: 47, payoff Apr 2030 | `calculator.test.ts` | ✅ |

---

## Deviations from Spec

### 1. Start date is always "today" — not user-configurable

**Spec (§2):** "Statement/simulation start date | Date | Defaults to today if not provided"
The phrase "if not provided" implies the field is user-facing with today as the default — not that the field is absent from the UI.

**Implementation:** `InputCard.tsx` hardcodes `startDate: today` at submission time. No date picker is exposed.

**Impact:** Users cannot model any payoff scenario that begins on a date other than today. Concrete cases this blocks:
- Planning a payoff that begins at the next statement cycle rather than mid-cycle.
- Modelling "what if I had started three months ago" comparisons.
- Generating schedules for a future start date (e.g. once a balance transfer settles).

The calculation engine accepts arbitrary start dates correctly; the gap is in the UI only. That makes it cheap to fix but does not make it cosmetic — for the user, the UI is the product.

**Recommendation:** Treat as an open gap. Either (a) confirm with product that the field was deliberately removed from scope and amend the spec to match, or (b) add a date picker before sign-off. Defaulting to "low impact" without product confirmation risks shipping a narrower product than the spec describes.

---

### 2. Validation error min-viable payment uses `Math.round`, spec says `round_up`

**Spec (Appendix A.2):** `minViablePayment = round_up(first_month_interest + 0.01, 2)`
**Implementation:** `Math.round((firstMonthInterest + 0.01) * 100) / 100`

**Impact:** Almost certainly none, but the original "equivalent because the inputs are already 2dp" reasoning does not survive JavaScript floating-point arithmetic. `75.00 + 0.01` does not always produce exactly `75.01` in IEEE 754; it may produce `75.01000000000001` or similar. In the cases tested, `Math.round` and `Math.ceil` happen to produce identical cent-level results, but the equivalence rests on the multiplication-by-100 absorbing the floating-point noise, not on the inputs being clean.

**Recommendation:** Cheapest path is to change the line to `Math.ceil((firstMonthInterest + 0.01) * 100) / 100`. This removes the deviation entirely, matches the spec verbatim, and costs one character. If the team prefers to keep `Math.round`, add a test that explicitly enumerates the edge cases where the two functions could diverge and demonstrates they don't, so the equivalence claim is backed by evidence rather than intuition.

---

## Features Shipped Beyond Spec ("Future Enhancements" from §10)

These were listed as "not blocking implementation, but worth considering." All three are implemented:

| Feature | Where | Notes |
|---------|-------|-------|
| Interest saved vs. minimum payment | `InterestSavedCallout.tsx` + `runBaselineSimulation` in `calculator.ts` | Shows "You'll save $X in interest and finish N months sooner." Handles indefinite-growth case. |
| Minimum payment explainer | `MinPaymentExplainer.tsx` | Collapsible panel showing the `max($25, 1%×balance + interest)` formula with live numbers. |
| Months saved vs. minimum | `SimulationResult.monthsSaved` | Displayed in `InterestSavedCallout` alongside interest saved. |

**Review status:** These features expanded the surface area beyond what the spec describes. Before sign-off, confirm: (a) design reviewed the final visual treatment of `InterestSavedCallout` and `MinPaymentExplainer`, (b) product approved their inclusion in this release rather than a follow-on, and (c) copy for the new strings (e.g. "You'll save $X in interest…") was reviewed alongside the rest of the product's voice. If any of these reviews happened informally during implementation, note that here so the audit trail is complete.

---

## Test Coverage

Test suite run: `npm test` — **96/96 passed** (8 test files).

| Test file | Focus area |
|-----------|------------|
| `calculator.test.ts` | Main simulation loop, sanity-check example, edge cases |
| `amortization.test.ts` | `deriveMonthlyPayment` formula + ceil rounding |
| `dates.test.ts` | `firstPaymentDate`, `nextPaymentDate`, short-month adjustment |
| `validation.test.ts` | `fixed_payment` rejection, APR=0 pass-through |
| `milestones.test.ts` | Tie-breaker, joint annotation, backfill logic |
| `baseline.test.ts` | `runBaselineSimulation` minimum payment model |
| `format.test.ts` | `formatCurrency`, `formatDate` output |
| `MinPaymentExplainer.test.tsx` | Component rendering |

---

## Review Areas Not Covered by Unit Tests

Unit tests verify calculation correctness, but several quality dimensions need separate confirmation before sign-off:

### Accessibility
- Keyboard navigation through the full input → submit → schedule flow.
- Screen reader labels on inputs, especially the conditional fields (`numberOfMonths` vs `monthlyPayment` toggle).
- Colour contrast on milestone rows. The teal background `#E1F5EE` is very light; the teal text colour on it should be checked against WCAG AA (4.5:1 for normal text, 3:1 for large). The purple `#EEEDFE` / purple-text combination on the 100% row needs the same check.
- The milestone "pill" badges need readable contrast independently of their parent row.
- Focus indicators visible on all interactive elements.

### Locale and currency formatting
- `formatCurrency` is unit-tested for output shape, but the spec does not state whether the product is USD-only or whether locale-aware formatting is expected. Confirm with product: should `Intl.NumberFormat` be locale-aware, or is USD with `en-US` formatting deliberate?
- Date formatting: same question. `formatDate` output (e.g. "Mon DD, YYYY") assumes US English ordering.

### Browser and device coverage
- 96/96 unit tests pass under Node, but no automated browser tests are listed. Confirm a manual QA pass on at least: latest Chrome, Safari, Firefox, plus mobile Safari and Chrome Android.
- Input modes on mobile: numeric inputs should trigger numeric keypads (`inputMode="decimal"` on currency fields, `inputMode="numeric"` on the due-day field).

### Performance at the safety cap
- The 600-iteration safety cap implies the schedule table may render up to 600 rows. Confirm: does `ScheduleTable.tsx` use virtualization, or does it render all rows? At 600 rows of styled output, unvirtualized rendering may cause noticeable jank on mobile or low-end devices.
- Verify scroll performance and that milestone styling does not cause layout thrash.

---

## Sign-off Checklist

**Open deviations from spec**
- [ ] Deviation 1 resolved: either start-date picker added, or product confirms the field is intentionally out of scope and the spec is updated to match.
- [ ] Deviation 2 resolved: either implementation changed to `Math.ceil`, or a test is added that proves `Math.round` and `Math.ceil` cannot produce different cent-level results on the inputs that reach this code path.

**Scope expansion review**
- [ ] Design has reviewed the visual treatment of `InterestSavedCallout` and `MinPaymentExplainer`.
- [ ] Product has approved including the three §10 features in this release rather than a follow-on.
- [ ] Copy for the new strings has been reviewed.

**Quality dimensions outside unit-test coverage**
- [ ] Accessibility audit complete: keyboard nav, screen reader labels, colour contrast on milestone rows and pills, visible focus indicators.
- [ ] Locale/currency formatting decisions confirmed with product (USD-only vs. locale-aware).
- [ ] Manual QA matrix run across target browsers including mobile Safari and Chrome Android.
- [ ] Mobile input modes verified (numeric keypads on appropriate fields).
- [ ] Schedule table performance verified at or near the 600-row safety cap.

**Calculation correctness**
- [ ] All §6 milestone logic (tie-breaker, joint annotation, backfill) reviewed and approved.
- [ ] 96/96 tests passing reviewed; coverage gaps (if any) acknowledged.

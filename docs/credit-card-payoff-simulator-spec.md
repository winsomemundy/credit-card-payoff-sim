# Credit Card Payoff Simulator — Requirements Specification

**Version:** 1.0 (Final)
**Status:** Ready for implementation

---

## 1. Overview

A simulator that generates a month-by-month payment schedule for paying down a credit card balance, with progress milestones to keep users motivated.

---

## 2. Inputs

All inputs are required unless otherwise noted.

| Field | Type | Constraints |
|---|---|---|
| Current balance | Decimal (USD) | Positive, two decimal places |
| Annual percentage rate (APR) | Percentage | 0–50 |
| Statement/simulation start date | Date | Defaults to today if not provided |
| Payment due day of month | Integer | 1–31; short months use last day |
| Payoff mode | Enum | Exactly one of `fixed_months` or `fixed_payment` |
| Number of months to pay off | Integer | Required when mode = `fixed_months`; positive |
| Monthly payment amount | Decimal (USD) | Required when mode = `fixed_payment`; positive |
| Assumed new monthly charges | Decimal (USD) | Optional; defaults to $0 |

---

## 3. Interest Calculation

- Monthly periodic rate = APR ÷ 12, applied to the balance at the start of each billing cycle.
- This is a simplified model of the average daily balance method, chosen for transparency and predictability.
- Interest accrues once per month, on the day before the payment due date.
- Payment is applied on the due date: **interest first, then principal**.
- If APR = 0, interest calculation is skipped entirely.

---

## 4. Validation Rules

### Fixed payment mode
- If the monthly payment is ≤ the first month's interest charge, **reject** with:
  > "Payment too low — balance would grow indefinitely. Minimum to make progress: $X.XX."

### Fixed months mode
- If the required monthly payment works out to < $25, **warn** the user but still produce the schedule.

### APR
- APR of 0 is valid (e.g., promotional balance). No interest is calculated.

---

## 5. Output Schedule

One row per month, from start date until the balance reaches zero.

### Row fields

1. Payment number (1, 2, 3, …)
2. Payment date (due day, adjusted for short months)
3. Starting balance for the cycle
4. Interest accrued
5. Payment amount
6. Principal paid
7. Ending balance
8. Milestone flag — one of: `null`, `"25%"`, `"50%"`, `"75%"`, `"100%"`

### Visual treatment
Milestone rows must be visually distinct in the UI (bold, highlighted background, or a marker column).

---

## 6. Progress Milestones

Four milestones are tracked against **cumulative principal paid** vs. the **original starting balance**:

| Milestone | Trigger condition |
|---|---|
| 25% | First row where cumulative principal paid ≥ 25% of starting balance |
| 50% | First row where cumulative principal paid ≥ 50% of starting balance |
| 75% | First row where cumulative principal paid ≥ 75% of starting balance |
| 100% | Final row (balance reaches zero) |

### Design rationale
- **Principal, not total paid.** Tracking principal matches the user's mental model of "how much of my debt is gone." Interest paid does not count toward milestone progress.
- **Against original balance, not current.** Milestones anchor to the starting balance, so they don't shift as the balance drops.

### New charges interaction
If assumed new monthly charges > $0, milestones still anchor to the original starting balance. The output must include a note explaining that new charges extend the payoff date beyond the milestone dates.

### Tie-breaker rule
When a single payment crosses multiple milestone thresholds in one row (e.g., cumulative principal jumps from 20% to 55%), **flag only the highest milestone reached** on that row. Lower milestones are skipped from the schedule.

### Skipped milestone dates
Even when a milestone is skipped in the schedule, the summary block still shows a "date reached" for it, using the date of the row that leapfrogged it, annotated to indicate joint reach.

**Example:**
- 25% reached: March 15, 2027
- 50% reached: August 15, 2027 *(reached together with 75%)*
- 75% reached: August 15, 2027
- 100% reached: December 15, 2027

---

## 7. Summary Block

Displayed alongside the schedule:

- Total months to payoff
- Total amount paid
- Total interest paid
- Effective payoff date
- Date each milestone reached (25%, 50%, 75%, 100%), with joint-reach annotations where applicable

---

## 8. Edge Cases (Handled Explicitly)

- **Final payment** is automatically reduced to clear the exact remaining balance — no overpayment.
- **Start date after due day:** if the simulation starts after the due day of the current month, the first payment moves to the next month.
- **Short months:** when the due day exceeds the month length (e.g., due day 31 in February), the last day of the month is used.

---

## 9. Out of Scope

The following are explicitly **not** modeled:

- Variable APR or promotional rate expiration
- Late fees, over-limit fees, or cash advance APR
- Weekend/holiday date shifting for payment dates
- Multiple cards or balance transfers
- Lump-sum extra payments outside the regular schedule

---

## 10. Open Questions / Future Enhancements

Not blocking implementation, but worth considering in a future version:

- "Interest saved vs. minimum payment" figure in the summary (motivational)
- Configurable currency and locale
- Variable monthly payments (e.g., pay more in certain months)
- Multiple-card debt avalanche / snowball planning

---

## Appendix A — Calculation Logic

This appendix specifies the calculations required to implement the simulator, in the order they execute.

### A.1 Setup & derived values

**Monthly periodic rate**
```
monthly_rate = APR / 100 / 12
```
If `APR == 0`, set `monthly_rate = 0` and skip all interest math.

**First payment date**
```
if start_date.day <= due_day:
    first_payment_date = adjust_for_short_month(start_date.year, start_date.month, due_day)
else:
    first_payment_date = adjust_for_short_month(next_month(start_date), due_day)
```

**Short-month adjustment**
```
adjust_for_short_month(year, month, due_day):
    last_day = days_in_month(year, month)
    return date(year, month, min(due_day, last_day))
```

**Milestone thresholds (dollar amounts, locked at start)**
```
threshold_25 = starting_balance * 0.25
threshold_50 = starting_balance * 0.50
threshold_75 = starting_balance * 0.75
```

### A.2 Mode-specific setup

**Fixed payment mode — validate payment is viable**
```
first_month_interest = current_balance * monthly_rate
if monthly_payment <= first_month_interest:
    REJECT with min_viable = round_up(first_month_interest + 0.01, 2)
```

**Fixed months mode — derive monthly payment**

Standard amortization formula:
```
if monthly_rate == 0:
    monthly_payment = starting_balance / num_months
else:
    monthly_payment = starting_balance * (monthly_rate * (1 + monthly_rate)^num_months)
                                        / ((1 + monthly_rate)^num_months - 1)
```
Then warn if `monthly_payment < 25`.

If `new_monthly_charges > 0`, the formula underestimates the payment needed to finish in `num_months`. The corrected payment that covers new charges too:
```
monthly_payment = (starting_balance * factor) + new_monthly_charges
```
where `factor` is the amortization factor above. This keeps payoff on schedule despite ongoing charges.

### A.3 Main loop — per month

For each payment number `n` starting at 1, with `current_balance` carried forward:

**Step A — Accrue interest**
```
interest = round(current_balance * monthly_rate, 2)
balance_after_interest = current_balance + interest + new_monthly_charges
```

**Step B — Determine payment amount**
```
scheduled_payment = monthly_payment  # from input or derived

# Final-payment adjustment: never overpay
if scheduled_payment >= balance_after_interest:
    actual_payment = balance_after_interest
else:
    actual_payment = scheduled_payment
```

**Step C — Split payment into interest vs. principal**
```
interest_portion = min(actual_payment, interest)
principal_paid = actual_payment - interest_portion
```

**Step D — Update running totals**
```
ending_balance = balance_after_interest - actual_payment
cumulative_principal += principal_paid
```

**Step E — Determine milestone flag (highest reached only)**
```
milestone = null

# Check 100% first (balance hits zero)
if ending_balance <= 0.005:  # within half a cent
    if not milestone_100_hit:
        milestone = "100%"
        milestone_100_hit = true
        milestone_100_date = payment_date

# Otherwise check 75 → 50 → 25, highest first
elif cumulative_principal >= threshold_75 and not milestone_75_hit:
    milestone = "75%"
    milestone_75_hit = true
    milestone_75_date = payment_date
    # Backfill skipped lower milestones with this date
    if not milestone_50_hit:
        milestone_50_hit = true
        milestone_50_date = payment_date
        milestone_50_joint = "75%"
    if not milestone_25_hit:
        milestone_25_hit = true
        milestone_25_date = payment_date
        milestone_25_joint = "75%"

elif cumulative_principal >= threshold_50 and not milestone_50_hit:
    milestone = "50%"
    milestone_50_hit = true
    milestone_50_date = payment_date
    if not milestone_25_hit:
        milestone_25_hit = true
        milestone_25_date = payment_date
        milestone_25_joint = "50%"

elif cumulative_principal >= threshold_25 and not milestone_25_hit:
    milestone = "25%"
    milestone_25_hit = true
    milestone_25_date = payment_date
```

The backfill logic handles the "skipped milestone date" requirement: if a single payment jumps past multiple thresholds, the row flags only the highest, but the summary block still records dates for the lower ones with a joint annotation.

**Step F — Compute next payment date**
```
next_payment_date = adjust_for_short_month(
    add_one_month(current_payment_date),
    due_day
)
```

**Loop termination**
- Exit when `ending_balance <= 0.005` (treat as zero, accounting for rounding).
- Safety cap: if loop exceeds 600 iterations (50 years), abort with error — likely a logic bug or pathological input.

### A.4 Summary calculations

After the loop completes:

```
total_months = n  # final payment number
total_amount_paid = sum of actual_payment across all rows
total_interest_paid = sum of interest_portion across all rows
effective_payoff_date = last row's payment_date
```

For each milestone, output its date plus joint annotation if set:
```
"25% reached: {milestone_25_date}" + (joint annotation if milestone_25_joint set)
```

### A.5 Rounding rules

- Round every dollar value to 2 decimals at the point it's stored on a schedule row.
- Use banker's rounding (round half to even) to minimize cumulative drift, **or** standard half-up — either is fine but pick one and apply consistently.
- Keep `cumulative_principal` and `current_balance` in full precision during the loop; only round on display.
- The final payment's auto-adjustment naturally absorbs any sub-cent drift from earlier rounding.

### A.6 Sanity-check example

Starting balance $5,000, APR 18%, $150/month, $0 new charges:

- `monthly_rate = 0.015`
- Month 1 interest: $5,000 × 0.015 = $75.00
- Payment $150 → $75 interest, $75 principal
- Ending balance: $4,925.00
- Cumulative principal: $75 (1.5% of $5,000 — no milestone yet)

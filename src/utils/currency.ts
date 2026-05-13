/**
 * src/utils/currency.ts
 *
 * The UAE dirham (AED) has been pegged to the US dollar at a fixed rate
 * since 1997 — no API needed, this rate never changes.
 */

const AED_PER_USD = 3.6725

/** Format a number as AED, e.g. "AED 1,250.00" */
export function fmtAED(amount: number): string {
  return `AED ${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Convert AED → USD and format, e.g. "≈ $340.43" */
export function fmtUSD(aedAmount: number): string {
  const usd = Math.abs(aedAmount) / AED_PER_USD
  return `≈ $${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

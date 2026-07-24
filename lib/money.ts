/**
 * Cent-safe arithmetic helpers for dollar-amount math.
 *
 * Money is still stored as a floating-point Number in Mongo (Invoice,
 * Transaction, Tier) — that storage format isn't changed here, and doing
 * so would be a real schema migration touching every read/write site
 * across billing, admin, and CSV export code, plus a backfill script for
 * existing records. That's deliberately out of scope for this change.
 *
 * What IS in scope: the actual arithmetic. Summing/discounting/taxing a
 * chain of plain JS number operations (`a + b`, `x * 0.085`) accumulates
 * binary floating-point drift — e.g. `0.1 + 0.2 !== 0.3`. Stripe-facing
 * amounts were already safe (multiplied by 100 and rounded right before
 * the API call), so the risk is concentrated in internal ledger/invoice
 * math. These helpers convert to integer cents for each operation, so
 * intermediate results can't drift, then convert back to a dollar float
 * for storage/display.
 */

const DOLLARS_TO_CENTS = 100;

/** Dollar amount -> integer cents, rounded to the nearest cent. */
export function toCents(amount: number): number {
  return Math.round(amount * DOLLARS_TO_CENTS);
}

/** Integer cents -> dollar amount with exactly 2 decimal places. */
export function fromCents(cents: number): number {
  return Math.round(cents) / DOLLARS_TO_CENTS;
}

/** Round a dollar amount to the nearest cent (fixes float noise in place). */
export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

export function addMoney(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/** Sum a list of dollar amounts without accumulating float drift. */
export function sumMoney(amounts: number[]): number {
  return fromCents(amounts.reduce((cents, amount) => cents + toCents(amount), 0));
}

/**
 * Apply a percentage to a dollar amount (e.g. tax/discount rate), rounding
 * in cents rather than rounding the float result afterward.
 */
export function applyPercentage(amount: number, percent: number): number {
  return fromCents(Math.round(toCents(amount) * (percent / 100)));
}

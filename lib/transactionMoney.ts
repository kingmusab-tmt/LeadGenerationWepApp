import { toCents } from "@/lib/money";

/**
 * Transaction types where amount/previousBalance/currentBalance are ALL
 * genuinely dollar-denominated. Every other type (lead_purchase,
 * call_purchase, lead_auto_purchase) stores a wallet UNIT count in those
 * same fields — not a fixed-rate dollar equivalent, since buyers can
 * purchase units at negotiated rates.
 *
 * units_purchase is NOT in this set even though its `amount` field is
 * genuinely dollars — its previousBalance/currentBalance are the buyer's
 * wallet UNIT count, not dollars, so treating all three fields uniformly
 * would corrupt them. See DOLLAR_DENOMINATED_AMOUNT_TYPES below for the
 * broader "is amount itself dollars" check that does include it.
 *
 * `seller_income_auto_accept` is deliberately excluded even though its
 * sibling `seller_income` is included: lib/autoAcceptPurchaseService.ts
 * writes `amount: lead.unit` for it — a unit count, not dollars — despite
 * being lumped in with real Stripe-dollar seller_income everywhere it's
 * summed as revenue (app/api/overview/route.ts's sellerIncomeTypes filter,
 * the admin financial dashboard). That's a pre-existing units/dollars
 * conflation bug in its own right, out of scope for R-31 to fix, but
 * cents-converting it here would make it worse, not better — it's not
 * dollars today, so there's nothing correct to convert.
 *
 * refund/admin_adjustment aren't listed in either set below because the
 * type alone doesn't say what they're refunding/adjusting — callers that
 * create those must resolve the referenced transaction's type themselves
 * (see app/api/admin/financial/transactions/[id]/refund/route.ts, which
 * uses isDollarDenominatedAmount against the ORIGINAL transaction it's
 * refunding).
 *
 * This is the single source of truth for which Transaction documents get
 * amountCents/previousBalanceCents/currentBalanceCents populated — see
 * models/transactions.ts and R-31 in the production readiness audit.
 */
export const DOLLAR_DENOMINATED_TRANSACTION_TYPES = new Set([
  "seller_income",
  "seller_payout",
  "subscription_payment",
  "subscription_renewal",
]);

/**
 * Broader than DOLLAR_DENOMINATED_TRANSACTION_TYPES — types whose `amount`
 * field specifically is dollars, even if previousBalance/currentBalance on
 * the same document are not (units_purchase). Use this when only `amount`
 * is being read/copied, not the balance fields.
 */
export const DOLLAR_DENOMINATED_AMOUNT_TYPES = new Set([
  ...DOLLAR_DENOMINATED_TRANSACTION_TYPES,
  "units_purchase",
]);

export function isDollarDenominatedTransactionType(type: string): boolean {
  return DOLLAR_DENOMINATED_TRANSACTION_TYPES.has(type);
}

export function isDollarDenominatedAmount(type: string): boolean {
  return DOLLAR_DENOMINATED_AMOUNT_TYPES.has(type);
}

/**
 * Computes the amountCents/previousBalanceCents/currentBalanceCents fields
 * to spread into a Transaction document being created, given the same
 * dollar values already being written to amount/previousBalance/
 * currentBalance. Returns an empty object for unit-based types, so
 * `{...someFields, ...dollarTransactionCents(type, amounts)}` is always
 * safe to spread regardless of transaction type.
 */
export function dollarTransactionCents(
  type: string,
  amounts: {
    amount: number;
    previousBalance: number;
    currentBalance: number;
  },
): {
  amountCents?: number;
  previousBalanceCents?: number;
  currentBalanceCents?: number;
} {
  if (!isDollarDenominatedTransactionType(type)) return {};
  return {
    amountCents: toCents(amounts.amount),
    previousBalanceCents: toCents(amounts.previousBalance),
    currentBalanceCents: toCents(amounts.currentBalance),
  };
}

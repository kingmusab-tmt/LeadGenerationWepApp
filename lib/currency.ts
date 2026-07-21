/**
 * Currency support for the US/UK/Canada target market.
 *
 * Stripe requires an explicit amount per currency — it does not auto-convert
 * a USD price at checkout time. FX_RATE_TO_USD below is a starting default
 * so GBP/CAD prices exist and are sane out of the box; an admin can override
 * the actual GBP/CAD price per tier at any time (see Tier.priceGBP/priceCAD),
 * which always takes precedence over the computed conversion.
 */
export const SUPPORTED_CURRENCIES = ["usd", "gbp", "cad"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "usd";

/** Rough, periodically-stale-by-design starting rates — override per tier instead of relying on these long-term. */
const FX_RATE_TO_USD: Record<SupportedCurrency, number> = {
  usd: 1,
  gbp: 0.79,
  cad: 1.37,
};

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

/** Converts a USD amount to the target currency using the default FX rate. */
export function convertFromUsd(
  amountUsd: number,
  currency: SupportedCurrency,
): number {
  if (currency === "usd") return amountUsd;
  return Math.round(amountUsd * FX_RATE_TO_USD[currency] * 100) / 100;
}

/** Resolves the actual price a tier should charge in a given currency: an
 * explicit per-currency override if the admin set one, otherwise a computed
 * conversion from the tier's base USD price. */
export function resolveTierPrice(
  tier: {
    price?: string;
    annualPrice?: string;
    priceGBP?: string;
    priceCAD?: string;
    annualPriceGBP?: string;
    annualPriceCAD?: string;
  },
  currency: SupportedCurrency,
  interval: "month" | "year" = "month",
): number {
  const basePrice = parseFloat(
    (interval === "year" ? tier.annualPrice : tier.price) || "0",
  );

  if (currency === "usd") return basePrice;

  const overrideKey =
    interval === "year"
      ? currency === "gbp"
        ? tier.annualPriceGBP
        : tier.annualPriceCAD
      : currency === "gbp"
        ? tier.priceGBP
        : tier.priceCAD;

  if (overrideKey) {
    const parsed = parseFloat(overrideKey);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return convertFromUsd(basePrice, currency);
}

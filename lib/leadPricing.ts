import { User } from "@/models/userModel";
import { Lead } from "@/models/leads";
import type { LeadQualityLevel } from "@/lib/aiQualityScoring";

const DEFAULT_LEAD_PRICING = { high: 10, medium: 5, low: 2 };

/**
 * Prices a lead per the seller's configured Lead Pricing by Quality tiers.
 * Must be called for every quality outcome (including AI-unavailable
 * fallbacks) — otherwise `Lead.unit` is left at the schema default (5),
 * silently ignoring the seller's configured price for that tier.
 */
export async function applyLeadPricing(
  leadId: string,
  sellerId: string,
  qualityLevel: LeadQualityLevel,
): Promise<void> {
  const seller = await User.findById(sellerId).select("leadPricing").lean();
  const pricing =
    (
      seller as {
        leadPricing?: { high?: number; medium?: number; low?: number };
      } | null
    )?.leadPricing || DEFAULT_LEAD_PRICING;

  const unitPrice =
    qualityLevel === "High"
      ? (pricing.high ?? DEFAULT_LEAD_PRICING.high)
      : qualityLevel === "Low"
        ? (pricing.low ?? DEFAULT_LEAD_PRICING.low)
        : (pricing.medium ?? DEFAULT_LEAD_PRICING.medium);

  await Lead.findByIdAndUpdate(leadId, { unit: unitPrice });
}

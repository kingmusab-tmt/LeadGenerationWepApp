/**
 * Admin Price Sync API
 *
 * Endpoints for managing price synchronization between Tier model and Stripe
 *
 * GET /api/admin/price-sync - Get price sync status and audit log
 * POST /api/admin/price-sync - Validate all tier prices or sync specific tier
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminAuth";
import {
  validateAllTierPrices,
  validateTierPrice,
  syncTierPricesWithStripe,
  getPriceAuditLog,
  getPriceSyncStatus,
} from "@/lib/priceSyncService";

/**
 * GET - Get price sync status and audit log
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) {
    return error;
  }

  const { searchParams } = new URL(request.url);
  const tierId = searchParams.get("tierId");
  const action = searchParams.get("action") as
    | "validation"
    | "sync"
    | "mismatch"
    | "coupon_created"
    | "coupon_applied"
    | null;
  const onlyUnresolved = searchParams.get("onlyUnresolved") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    // Get overall status
    const status = await getPriceSyncStatus();

    // Get filtered audit log
    const auditLog = getPriceAuditLog({
      tierId: tierId || undefined,
      action: action || undefined,
      onlyUnresolved,
      limit,
    });

    return NextResponse.json({
      success: true,
      status: {
        totalTiers: status.totalTiers,
        tiersWithStripePrices: status.tiersWithStripePrices,
        tiersWithDiscounts: status.tiersWithDiscounts,
        unresolvedMismatches: status.unresolvedMismatches,
      },
      auditLog,
    });
  } catch (error) {
    console.error("[Admin Price Sync] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get price sync status" },
      { status: 500 },
    );
  }
}

/**
 * POST - Validate or sync prices
 *
 * Body:
 * - action: "validate" | "validate_all" | "sync"
 * - tierId: string (required for "validate" and "sync")
 * - billingInterval: "month" | "year" (optional, for "validate")
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { action, tierId, billingInterval = "month" } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required (validate, validate_all, sync)" },
        { status: 400 },
      );
    }

    switch (action) {
      case "validate": {
        if (!tierId) {
          return NextResponse.json(
            { error: "tierId is required for validate action" },
            { status: 400 },
          );
        }

        const result = await validateTierPrice(tierId, billingInterval);
        return NextResponse.json({
          success: true,
          validation: result,
        });
      }

      case "validate_all": {
        const results = await validateAllTierPrices();
        return NextResponse.json({
          success: true,
          allValid: results.allValid,
          totalTiers: results.results.length,
          mismatches: results.mismatches,
          details: results.results,
        });
      }

      case "sync": {
        if (!tierId) {
          return NextResponse.json(
            { error: "tierId is required for sync action" },
            { status: 400 },
          );
        }

        const syncResult = await syncTierPricesWithStripe(tierId);
        return NextResponse.json({
          success: syncResult.success,
          monthlyPriceId: syncResult.monthlyPriceId,
          annualPriceId: syncResult.annualPriceId,
          couponId: syncResult.couponId,
          errors: syncResult.errors,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Admin Price Sync] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process price sync request" },
      { status: 500 },
    );
  }
}

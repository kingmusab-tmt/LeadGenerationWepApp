import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { withErrorHandler } from "@/lib/api/async-handler";
import { forbidden, unauthorized } from "@/lib/api/error-handler";

import { isSellerRole } from "@/lib/roles";
/**
 * POST /api/sellers/update-buyer-status
 * Checks all buyers with status "new" registered with the seller
 * and updates their status to "active" if they have at least one entry in purchaseHistory.
 *
 * Optional query param: buyerId - to check and update a specific buyer only
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Authenticate the seller
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return unauthorized("Authentication required");
  }

  await connectDB();

  const sellerId = session.user.id;
  const sellerRole = session.user.role;

  if (!sellerId || !isSellerRole(sellerRole)) {
    return forbidden("Only sellers can perform this action");
  }

  // Check if a specific buyerId was provided
  const { searchParams } = new URL(req.url);
  const specificBuyerId = searchParams.get("buyerId");

  // Build query to find "new" buyers with purchases, registered with this seller
  const buyerQuery: Record<string, unknown> = {
    registeredWith: sellerId,
    status: "new",
    "purchaseHistory.0": { $exists: true },
  };

  // If a specific buyer ID is provided, add it to the query
  if (specificBuyerId) {
    buyerQuery._id = specificBuyerId;
  }

  // Use updateMany for a single DB round-trip instead of find + loop + save.
  // isActive is kept in sync here too — it previously only got set
  // correctly at CSV-import time, so a buyer activated through this route
  // stayed isActive:false forever despite status:"active".
  const result = await Buyer.updateMany(buyerQuery, {
    $set: { status: "active", isActive: true },
  });

  return NextResponse.json({
    success: true,
    message: `Successfully updated ${result.modifiedCount} buyer(s) from 'new' to 'active'`,
    updatedCount: result.modifiedCount,
    checkedCount: result.matchedCount,
  });
});

/**
 * GET /api/sellers/update-buyer-status
 * Checks buyers with status "new" and returns which ones would be updated
 * without actually updating them (dry run / preview).
 */
export const GET = withErrorHandler(async () => {
  // Authenticate the seller
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return unauthorized("Authentication required");
  }

  await connectDB();

  const sellerId = session.user.id;
  const sellerRole = session.user.role;

  if (!sellerId || !isSellerRole(sellerRole)) {
    return forbidden("Only sellers can perform this action");
  }

  // Find all buyers with status "new" registered with this seller
  const newBuyers = await Buyer.find({
    registeredWith: sellerId,
    status: "new",
  })
    .select("_id name email company purchaseHistory")
    .lean();

  if (newBuyers.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No buyers with status 'new' found",
      newBuyersCount: 0,
      eligibleForActivation: [],
      notEligible: [],
    });
  }

  const eligibleForActivation: {
    id: string;
    name: string;
    email: string;
    company: string;
    purchaseCount: number;
    firstPurchase: Date | null;
    lastPurchase: Date | null;
  }[] = [];

  const notEligible: {
    id: string;
    name: string;
    email: string;
    company: string;
    reason: string;
  }[] = [];

  for (const buyer of newBuyers) {
    if (buyer.purchaseHistory && buyer.purchaseHistory.length > 0) {
      // Sort purchase history by date to get first and last purchase
      const sortedHistory = [...buyer.purchaseHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      eligibleForActivation.push({
        id: buyer._id.toString(),
        name: buyer.name,
        email: buyer.email,
        company: buyer.company,
        purchaseCount: buyer.purchaseHistory.length,
        firstPurchase: sortedHistory[0]?.date || null,
        lastPurchase: sortedHistory[sortedHistory.length - 1]?.date || null,
      });
    } else {
      notEligible.push({
        id: buyer._id.toString(),
        name: buyer.name,
        email: buyer.email,
        company: buyer.company,
        reason: "No lead purchases found in purchaseHistory",
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Found ${eligibleForActivation.length} buyer(s) eligible for activation`,
    newBuyersCount: newBuyers.length,
    eligibleForActivation,
    notEligible,
  });
});

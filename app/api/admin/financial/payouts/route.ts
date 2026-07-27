import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

// Was a permanent stub returning `{ payouts: [] }` — no Payout model was
// ever created. Seller payouts already exist as Transaction records
// (type: "seller_payout", written by app/api/payments/payout/stripe), so
// this reads from that instead of introducing a second, parallel model
// for data that's already tracked.
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

function toFrontendStatus(
  status: "pending" | "completed" | "failed" | "refunded",
): "pending" | "processed" | "failed" {
  if (status === "completed") return "processed";
  if (status === "pending") return "pending";
  return "failed";
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || "", 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Transaction.find({ type: "seller_payout" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ type: "seller_payout" }),
    ]);

    const formattedPayouts = payouts.map((payout) => {
      const status = toFrontendStatus(payout.status);
      return {
        id: payout._id.toString(),
        sellerId: payout.metadata?.sellerId
          ? String(payout.metadata.sellerId)
          : String(payout.userId),
        sellerName: payout.metadata?.sellerName || "Unknown Seller",
        amount: payout.amount,
        status,
        method: payout.paymentGateway === "stripe" ? "stripe" : "bank_transfer",
        createdAt: payout.createdAt.toISOString(),
        processedAt: status !== "pending" ? payout.updatedAt.toISOString() : undefined,
      };
    });

    return NextResponse.json({
      payouts: formattedPayouts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch payouts:", error);
    return internalError("Failed to fetch payouts");
  }
}

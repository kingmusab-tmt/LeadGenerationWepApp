import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { badRequest, internalError, notFound } from "@/lib/api/error-handler";

/**
 * PUT /api/admin/financial/payouts/[id]/process
 *
 * Manually marks a pending seller payout as processed. This is a
 * bookkeeping confirmation only — it does not call Stripe. The actual
 * money movement (transfer + payout) already happened when the seller
 * requested it via /api/payments/payout/stripe; this exists for an admin
 * to confirm, after checking the Stripe dashboard, that a payout that
 * settled outside the app's own visibility (no payout webhook is wired up
 * yet) is done, so it stops showing as perpetually "pending" here.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const { id } = await params;

    // Atomically claim it — only matches a payout still pending, so two
    // concurrent clicks (or a retry) can't both "process" the same payout
    // and write two audit entries for one action.
    const payout = await Transaction.findOneAndUpdate(
      { _id: id, type: "seller_payout", status: "pending" },
      { $set: { status: "completed" } },
      { new: true },
    );

    if (!payout) {
      const exists = await Transaction.exists({ _id: id, type: "seller_payout" });
      if (!exists) return notFound("Payout");
      return badRequest("This payout is not pending — it may already be processed.");
    }

    await recordAuditLog({
      actor: session!.user,
      action: "payout.processed",
      targetType: "Transaction",
      targetId: id,
      summary: `Marked seller payout of ${payout.currency} ${payout.amount} as processed for ${payout.metadata?.sellerName || "seller"}`,
      metadata: {
        sellerId: payout.metadata?.sellerId,
        amount: payout.amount,
        currency: payout.currency,
        stripeTransferId: payout.gatewayTransactionId,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      payout: {
        id: payout._id.toString(),
        status: "processed",
        processedAt: payout.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to process payout:", error);
    return internalError("Failed to process payout");
  }
}

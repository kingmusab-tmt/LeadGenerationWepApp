import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import { requireSuperAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { badRequest, internalError, notFound } from "@/lib/api/error-handler";

// Refunds are irreversible and move real money, so this requires
// super-admin rather than the standard admin check.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, actor } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    await dbConnect();

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return notFound("Transaction");
    }

    if (transaction.status === "refunded") {
      return badRequest("Transaction has already been refunded");
    }

    if (transaction.status !== "completed") {
      return badRequest("Only completed transactions can be refunded");
    }

    // Update the original transaction status to refunded
    transaction.status = "refunded";
    await transaction.save();

    // Create a refund transaction record
    await Transaction.create({
      type: "refund",
      userId: transaction.userId,
      amount: transaction.amount,
      previousBalance: 0,
      currentBalance: 0,
      currency: transaction.currency || "USD",
      paymentGateway: transaction.paymentGateway,
      status: "completed",
      metadata: {
        ...transaction.metadata,
        refund: true,
        refundReason: "Admin-initiated refund",
        refundedTransactionId: transaction._id,
      },
    });

    await recordAuditLog({
      actor: actor!,
      action: "transaction.refund",
      targetType: "Transaction",
      targetId: id,
      summary: `Refunded ${transaction.currency || "USD"} ${transaction.amount} transaction for user ${transaction.userId}`,
      metadata: {
        amount: transaction.amount,
        currency: transaction.currency,
        originalType: transaction.type,
        userId: String(transaction.userId),
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
    });
  } catch (err) {
    console.error("Failed to process refund:", err);
    return internalError("Failed to process refund");
  }
}

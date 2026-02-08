import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    await dbConnect();

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (transaction.status === "refunded") {
      return NextResponse.json(
        { error: "Transaction has already been refunded" },
        { status: 400 },
      );
    }

    if (transaction.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed transactions can be refunded" },
        { status: 400 },
      );
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

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
    });
  } catch (err) {
    console.error("Failed to process refund:", err);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 },
    );
  }
}

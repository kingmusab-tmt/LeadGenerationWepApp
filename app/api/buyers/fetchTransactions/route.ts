import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email || session.user.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id",
    );

    if (!buyer) {
      return notFound("Buyer");
    }

    // Convert buyer._id to a string
    const buyerId = buyer._id.toString();

    // Fetch transactions using the stringified buyerId
    const transactions = await Transaction.find({ userId: buyerId }).sort({
      createdAt: -1,
    });

    // Return the transactions in the expected format
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return internalError("Internal server error");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id"
    );

    if (!buyer) {
      return NextResponse.json(
        { success: false, message: "Buyer not found" },
        { status: 404 }
      );
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
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

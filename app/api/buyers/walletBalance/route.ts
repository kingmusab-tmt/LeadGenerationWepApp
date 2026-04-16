// app/api/buyers/walletBalance/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session?.user?.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const buyer = await Buyer.findOne({ email: session.user.email })
      .select("walletUnit")
      .lean();

    if (!buyer) {
      return notFound("Buyer");
    }

    return NextResponse.json(
      { success: true, data: { balance: buyer.walletUnit } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return internalError("Internal server error");
  }
}

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models";
// import { Payout } from "@/models/payouts";
import dbConnect from "@/lib/connectdb";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // const payouts = await Payout.find()
    //   .populate("sellerId", "name", User)
    //   .sort({ createdAt: -1 })
    //   .lean();

    // const formattedPayouts = payouts.map((payout) => ({
    //   id: payout._id.toString(),
    //   sellerId: payout.sellerId._id.toString(),
    //   sellerName: payout.sellerId.name,
    //   amount: payout.amount,
    //   status: payout.status,
    //   method: payout.method,
    //   createdAt: payout.createdAt.toISOString(),
    //   processedAt: payout.processedAt?.toISOString(),
    // }));

    // return NextResponse.json({ payouts: formattedPayouts });
  } catch (error) {
    console.error("Failed to fetch payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 },
    );
  }
}

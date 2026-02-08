import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    // const payouts = await Payout.find()
    //   .populate("sellerId", "name", User)
    //   .sort({ createdAt: -1 })
    //   .lean();

    // TODO: Uncomment when Payout model is created
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

    return NextResponse.json({ payouts: [] });
  } catch (error) {
    console.error("Failed to fetch payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 },
    );
  }
}

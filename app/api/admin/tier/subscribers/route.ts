import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { User } from "@/models";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    // Aggregate subscriber counts per tier
    const results = await User.aggregate([
      {
        $match: {
          "subscription.subscriptionTierId": { $exists: true, $ne: null },
          "subscription.isSubscriptionActive": true,
        },
      },
      {
        $group: {
          _id: "$subscription.subscriptionTierId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to a map of tierId -> count
    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result._id.toString()] = result.count;
    }

    return NextResponse.json({ counts });
  } catch (err) {
    console.error("Failed to fetch subscriber counts:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscriber counts" },
      { status: 500 },
    );
  }
}

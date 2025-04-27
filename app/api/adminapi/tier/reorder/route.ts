import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
// Update tier order (bulk update)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tiers: updatedTiers } = await req.json();

    if (!Array.isArray(updatedTiers)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    await dbConnect();

    const bulkOps = updatedTiers.map((tier) => ({
      updateOne: {
        filter: { _id: tier._id },
        update: { $set: { order: tier.order } },
      },
    }));

    await Tier.bulkWrite(bulkOps);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tiers:", error);
    return NextResponse.json(
      { error: "Failed to update tiers" },
      { status: 500 }
    );
  }
}

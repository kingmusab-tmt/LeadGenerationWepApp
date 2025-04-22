import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// GET all tiers (including inactive)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role != "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const tiers = await Tier.find().sort({ order: 1 });
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Error fetching tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch tiers" },
      { status: 500 }
    );
  }
}

// Create a new tier
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();

    // Set order to last if not provided
    if (!data.order) {
      const count = await Tier.countDocuments();
      data.order = count + 1;
    }

    const tier = new Tier(data);
    await tier.save();
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("Error creating tier:", error);
    return NextResponse.json(
      { error: "Failed to create tier" },
      { status: 500 }
    );
  }
}

// Update multiple tiers (for reordering)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tiers } = await req.json();
    await dbConnect();

    const bulkOps = tiers.map((tier: any) => ({
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

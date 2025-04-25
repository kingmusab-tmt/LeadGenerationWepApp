import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";

export async function GET() {
  try {
    await dbConnect();
    const tiers = await Tier.find({ isActive: true }).sort({ order: 1 });
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing tiers" },
      { status: 500 }
    );
  }
}

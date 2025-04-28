// Import necessary modules
import { NextRequest, NextResponse } from "next/server";
import { Campaign } from "@/models/campaign";
import dbConnect from "@/lib/connectdb";

// GET /api/campaigns - Fetch all campaigns
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const campaigns = await Campaign.find();
    return NextResponse.json(campaigns, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch campaigns." },
      { status: 500 }
    );
  }
}

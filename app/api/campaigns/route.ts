// Import necessary modules
import { NextRequest, NextResponse } from "next/server";
import { Campaign } from "@/models/campaign";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";
// GET /api/campaigns - Fetch all campaigns
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

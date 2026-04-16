// Import necessary modules
import { NextResponse } from "next/server";
import { Campaign } from "@/models/campaign";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";
// GET /api/campaigns - Fetch all campaigns
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }
    await dbConnect();
    const campaigns = await Campaign.find();
    return NextResponse.json(campaigns, { status: 200 });
  } catch {
    return internalError("Failed to fetch campaigns.");
  }
}

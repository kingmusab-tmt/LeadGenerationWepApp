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

// GET /api/campaigns/search - Fetch a single campaign based on query
// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const campaignId = searchParams.get("id");

//   if (!campaignId) {
//     return NextResponse.json({ error: "Campaign ID is required." }, { status: 400 });
//   }

//   try {
//     await dbConnect();
//     const campaign = await Campaign.findById(campaignId);
//     if (!campaign) {
//       return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
//     }
//     return NextResponse.json(campaign, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: "Failed to fetch campaign." }, { status: 500 });
//   }
// }

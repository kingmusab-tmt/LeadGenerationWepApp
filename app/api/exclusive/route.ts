import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/models/leads";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to update this lead." },
        { status: 401 },
      );
    }

    // Extract leadId from the query parameters (search params)
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required as a query parameter." },
        { status: 400 },
      );
    }

    const sellerId = session.user.id;

    // Find the lead
    const lead = await Lead.findOne({ _id: leadId, sellerId });

    if (!lead) {
      return NextResponse.json(
        {
          error: `Lead with ID ${leadId} not found or you do not have permission.`,
        },
        { status: 404 },
      );
    }

    // Toggle exclusive status
    lead.exclusive = !lead.exclusive;
    await lead.save();

    return NextResponse.json(
      {
        message: `Lead exclusivity successfully updated to ${lead.exclusive}.`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating exclusive status:", error);

    return NextResponse.json(
      {
        error: "Failed to update exclusive status.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

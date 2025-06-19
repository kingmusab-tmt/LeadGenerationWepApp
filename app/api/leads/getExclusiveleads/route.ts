// pages/api/leads.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "seller") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch leads that are exclusive and available
    const availableLeads = await Lead.find({
      exclusive: true,
      status: "available",
      userId: session.user.id,
    });
    //("Available leads:", availableLeads);

    return NextResponse.json(availableLeads, { status: 200 });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

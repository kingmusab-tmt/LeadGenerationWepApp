// pages/api/lead-buyers.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
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

    const { searchParams } = new URL(req.url);
    const preferredMethod = searchParams.get("preferredMethod");

    // Fetch buyers from the database based on preferredMethod
    const filteredBuyers = await Buyer.find(
      preferredMethod ? { preferredMethod } : {}
    );

    return NextResponse.json(filteredBuyers, { status: 200 });
  } catch (error) {
    console.error("Error fetching lead buyers:", error);
    return NextResponse.json(
      { message: "Failed to fetch lead buyers" },
      { status: 500 }
    );
  }
}

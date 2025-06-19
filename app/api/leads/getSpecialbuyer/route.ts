// pages/api/lead-buyers.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { authOptions } from "@/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 }
    );
  }
  // Ensure the user is authenticated and has the role of "seller"
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "seller") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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

    // Create filter object
    const filter: any = {
      registeredWith: new mongoose.Types.ObjectId(session.user.id),
    };

    // Add preferredMethod to filter if provided
    if (preferredMethod) {
      filter.preferredMethod = preferredMethod;
    }

    // Fetch buyers from the database
    const filteredBuyers = await Buyer.find(filter);

    return NextResponse.json(filteredBuyers, { status: 200 });
  } catch (error) {
    console.error("Error fetching lead buyers:", error);
    return NextResponse.json(
      { message: "Failed to fetch lead buyers" },
      { status: 500 }
    );
  }
}

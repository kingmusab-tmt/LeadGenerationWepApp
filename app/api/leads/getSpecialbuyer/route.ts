// pages/api/lead-buyers.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { authOptions } from "@/auth";
import mongoose from "mongoose";
import {
  internalError,
  methodNotAllowed,
  unauthorized,
} from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return methodNotAllowed();
  }
  // Ensure the user is authenticated and has the role of "seller"
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "seller") {
    return unauthorized("Authentication required");
  }

  try {
    // Connect to the database
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const preferredMethod = searchParams.get("preferredMethod");

    // Create filter object
    const filter: Record<string, unknown> = {
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
    return internalError("Failed to fetch lead buyers");
  }
}

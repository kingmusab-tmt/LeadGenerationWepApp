// pages/api/leads.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { authOptions } from "@/auth";
import {
  internalError,
  methodNotAllowed,
  unauthorized,
} from "@/lib/api/error-handler";

import { isSellerRole } from "@/lib/roles";
export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  // Ensure the user is authenticated and has the role of "seller"
  const session = await getServerSession(authOptions);
  if (!session || !isSellerRole(session.user.role)) {
    return unauthorized("Authentication required");
  }

  try {
    // Connect to the database
    await dbConnect();

    // Fetch leads that are exclusive and available
    const availableLeads = await Lead.find({
      exclusive: true,
      status: "available",
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: availableLeads },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return internalError("Failed to fetch leads");
  }
}

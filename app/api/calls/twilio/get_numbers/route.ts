// This file is part of the Twilio integration for fetching tracking numbers.
// It connects to the database, retrieves the seller's tracking numbers,
// and returns them in the response.
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

type TrackingNumberEntry = {
  purpose?: string;
  [key: string]: unknown;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.role) {
      return unauthorized("Authentication required");
    }
    // Ensure the user is authenticated and has a valid session
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }
    await dbConnect();

    const purpose = req.nextUrl.searchParams.get("purpose");
    const seller = await User.findById(session.user.id);
    if (!seller) return notFound("Seller");

    let numbers = (seller.trackingNumbers || []) as TrackingNumberEntry[];

    // Filter by purpose if provided
    if (purpose) {
      numbers = numbers.filter((num) => num.purpose === purpose);
    }

    return NextResponse.json({ success: true, data: numbers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching Twilio numbers:", error);
    return internalError("Failed to fetch numbers");
  }
}

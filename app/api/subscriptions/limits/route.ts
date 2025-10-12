// app/api/subscription/limits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    // Validate sellerId parameter
    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      );
    }

    // Authorization check
    if (session.user.id !== sellerId && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - You can only access your own data" },
        { status: 403 }
      );
    }

    // Connect to database
    await dbConnect();

    // Convert string ID to ObjectId
    let sellerObjectId;
    try {
      sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid seller ID format" },
        { status: 400 }
      );
    }

    // Find user with subscription data
    const user = await User.aggregate([
      { $match: { _id: sellerObjectId } },
      {
        $project: {
          twilioActivated: 1,
          "subscription.subscriptionLimits": 1,
          "subscription.subscriptionTierId": 1,
          buyerCount: { $size: { $ifNull: ["$buyers", []] } },
        },
      },
    ]);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = user[0];

    // Prepare response
    return NextResponse.json({
      currentCount: userData.buyerCount || 0,
      subscriptionLimits: userData.subscription?.subscriptionLimits || {
        leads: 0,
        twilioNumbers: 0,
        numbers: 0,
        callSeconds: 0,
        forms: 0,
        buyers: 0,
        exports: false,
        imports: false,
        liveSupport: false,
        industries: 0,
      },
      tierId: userData.subscription?.subscriptionTierId || null,
    });
  } catch (error) {
    console.error("Error in GET /api/subscription/limits:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

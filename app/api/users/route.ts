import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { Buyer } from "@/models/leadbuyers";
import { invalidateSessionCache } from "@/lib/cachedSession";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return NextResponse.json(
      { success: false, message: "Method not allowed" },
      { status: 405 },
    );
  }
  await dbConnect();

  let filterUser = {};

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const email = session?.user?.email;
  if (!email) {
    return Response.json(
      { success: false, message: "User Email not Found" },
      { status: 401 },
    );
  }
  filterUser = { email };

  const cacheHeaders = {
    "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
  };

  try {
    const user = await User.findOne(filterUser)
      .select(
        "name email image role mobile mobileNumber businessName isSubActive stripeCustomerId currentPlan",
      )
      .lean();

    if (!user) {
      // Clear stale session cache so the client can re-authenticate cleanly
      await invalidateSessionCache(email);
      return NextResponse.json(
        { success: false, message: "Session expired. Please sign in again." },
        { status: 401 },
      );
    }
    if (user.role === "buyer") {
      const leadbuyerDetail = await Buyer.findOne({
        email: user.email,
      } as any)
        .select("name email walletBalance autoAccept preferences")
        .lean();
      return NextResponse.json(
        { user, leadbuyerDetail },
        { status: 200, headers: cacheHeaders },
      );
    }

    // Return user for any other role (seller, admin, staff, etc.)
    return NextResponse.json({ user }, { status: 200, headers: cacheHeaders });
  } catch (error) {
    console.error("[/api/users] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

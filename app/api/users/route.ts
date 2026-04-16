import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { Buyer } from "@/models/leadbuyers";
import { invalidateSessionCache } from "@/lib/cachedSession";
import {
  internalError,
  methodNotAllowed,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return methodNotAllowed();
  }
  await dbConnect();

  let filterUser = {};

  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }
  const email = session?.user?.email;
  if (!email) {
    return unauthorized("User email not found");
  }
  filterUser = { email };

  const cacheHeaders = {
    "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
  };

  try {
    const user = await User.findOne(filterUser)
      .select(
        "name email image role mobile mobileNumber businessName businessEmail businessPhone businessWebsite companyDescription industryNiche businessAddress isSubActive stripeCustomerId currentPlan subscription.isTrial subscription.subscriptionLimits",
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
      })
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
    return internalError("Internal server error");
  }
}

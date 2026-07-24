import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  forbidden,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

/**
 * GET /api/calls/twilio/get_lead_buyers?sellerId=...
 * Returns the list of buyers registered with the seller, for populating the
 * "Specific Lead Buyers" forwarding-type picker in the Forwarding tab.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.role) {
      return unauthorized("Authentication required");
    }
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const sellerId = req.nextUrl.searchParams.get("sellerId");
    const targetSellerId =
      session.user.role === "admin" && sellerId ? sellerId : session.user.id;

    if (
      session.user.role !== "admin" &&
      sellerId &&
      String(sellerId) !== String(session.user.id)
    ) {
      return forbidden("You can only access your own lead buyers");
    }

    await dbConnect();

    const seller = await User.findById(targetSellerId).select("buyers").lean();
    if (!seller) {
      return notFound("Seller");
    }

    const sellerBuyerIds = (seller as unknown as { buyers?: unknown[] }).buyers;

    let buyers = await Buyer.find({
      _id: { $in: sellerBuyerIds ?? [] },
    })
      .select("name company phone")
      .lean();

    if (buyers.length === 0) {
      buyers = await Buyer.find({ registeredWith: targetSellerId })
        .select("name company phone")
        .lean();
    }

    const data = buyers.map((b) => ({
      id: b._id.toString(),
      name: b.name || b.company || b._id.toString(),
      phone: b.phone,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("Error fetching lead buyers:", error);
    return internalError("Failed to fetch lead buyers");
  }
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

import { isSellerRole } from "@/lib/roles";
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user?.role) {
      return unauthorized("Authentication required");
    }

    if (!isSellerRole(session.user.role) && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "twilio-activate",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

    await dbConnect();

    let body: { sellerId?: string; action?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON in request body");
    }
    const { sellerId, action } = body;

    if (!sellerId || !action) {
      return badRequest("sellerId and action are required");
    }

    if (
      session.user.role !== "admin" &&
      String(sellerId) !== String(session.user.id)
    ) {
      return forbidden("You can only update your own Twilio activation state");
    }

    const seller = await User.findById(sellerId);
    if (!seller) {
      return notFound("Seller");
    }

    if (action === "activate") {
      seller.twilioActivated = true;
    } else if (action === "deactivate") {
      seller.twilioActivated = false;
    } else {
      return badRequest("Invalid action. Use 'activate' or 'deactivate'");
    }

    await seller.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          message: `Twilio ${action}d successfully`,
          twilioActivated: seller.twilioActivated,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Twilio activation error:", error);
    return internalError("Operation failed");
  }
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import Call from "@/models/call";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const buyerId = req.nextUrl.searchParams.get("buyerId");
    if (!buyerId) return badRequest("Buyer ID required");

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id || session.user.role !== "buyer") {
      return unauthorized("Authentication required");
    }
    const buyer = await Buyer.findById(buyerId);
    if (!buyer) {
      return notFound("Buyer");
    }
    const email = buyer?.email;
    if (email !== session.user.email) {
      return forbidden("Forbidden");
    }

    const totalCallLeads = await Call.countDocuments({ buyerId });
    const answeredCallLeads = await Call.countDocuments({
      buyerId,
      status: "answered",
    });
    const missedCallLeads = totalCallLeads - answeredCallLeads;

    const conversionRate =
      totalCallLeads > 0 ? (answeredCallLeads / totalCallLeads) * 100 : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          totalCallLeads,
          answeredCallLeads,
          missedCallLeads,
          conversionRate,
        },
      },
      { status: 200 },
    );
  } catch {
    return internalError("Failed to fetch analytics");
  }
}

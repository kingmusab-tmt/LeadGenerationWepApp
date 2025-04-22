import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import Call from "@/models/call";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const buyerId = req.nextUrl.searchParams.get("buyerId");
    if (!buyerId)
      return new NextResponse(JSON.stringify({ error: "Buyer ID required" }), {
        status: 400,
      });

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id || session.user.role !== "buyer") {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const buyer = await Buyer.findById(buyerId);
    const email = buyer?.email;
    if (email !== session.user.email) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const totalCallLeads = await Call.countDocuments({ buyerId });
    const answeredCallLeads = await Call.countDocuments({
      buyerId,
      status: "answered",
    });
    const missedCallLeads = totalCallLeads - answeredCallLeads;

    const conversionRate =
      totalCallLeads > 0 ? (answeredCallLeads / totalCallLeads) * 100 : 0;

    return new NextResponse(
      JSON.stringify({
        totalCallLeads,
        answeredCallLeads,
        missedCallLeads,
        conversionRate,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch analytics" }),
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get the seller ID from the session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401 }
      );
    }
    const sellerId = session.user.id;

    const calls = await Call.find({ userId: sellerId });

    const callsWithBuyerInfo = await Promise.all(
      calls.map(async (call) => {
        if (call.buyerId) {
          const buyer = await Buyer.findById(call.buyerId);
          if (buyer) {
            return {
              ...call.toObject(),
              buyerName: buyer.name,
              industry: buyer.leadPreferences.industry,
            };
          }
        }
        return { ...call.toObject(), buyerName: "N/A", industry: "N/A" };
      })
    );

    return new NextResponse(JSON.stringify(callsWithBuyerInfo), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers"; // Import the Buyer model

export async function GET(req: NextRequest) {
  try {
    await dbConnect(); // Ensure database connection

    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if the session exists and the user is a buyer
    if (!session || session.user.role !== "buyer") {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Fetch the buyerId using the email from the session
    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id"
    );

    if (!buyer) {
      return new NextResponse(JSON.stringify({ error: "Buyer not found" }), {
        status: 404,
      });
    }

    const buyerId = buyer._id;

    // Fetch calls for the buyer, sorted by createdAt in descending order
    const calls = await Call.find({ buyerId }).sort({ createdAt: -1 });

    // Return the calls as a JSON response
    return new NextResponse(JSON.stringify(calls), { status: 200 });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch calls" }),
      { status: 500 }
    );
  }
}

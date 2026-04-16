import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers"; // Import the Buyer model
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  try {
    await dbConnect(); // Ensure database connection

    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if the session exists and the user is a buyer
    if (!session || session.user.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    // Fetch the buyerId using the email from the session
    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id",
    );

    if (!buyer) {
      return notFound("Buyer");
    }

    const buyerId = buyer._id;

    // Fetch calls for the buyer, sorted by createdAt in descending order
    const calls = await Call.find({ buyerId }).sort({ createdAt: -1 });

    // Return the calls as a JSON response
    return NextResponse.json({ success: true, data: calls }, { status: 200 });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return internalError("Failed to fetch calls");
  }
}

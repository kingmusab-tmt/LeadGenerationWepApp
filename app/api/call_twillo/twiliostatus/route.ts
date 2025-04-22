import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user"; // Import the User model

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");

  if (!sellerId) {
    return NextResponse.json(
      { message: "Seller ID is required" },
      { status: 400 }
    );
  }

  try {
    // Connect to the database
    await dbConnect();

    // Find the user (seller) by sellerId
    const user = await User.findOne({ sellerId });

    if (!user) {
      return NextResponse.json(
        { message: "Seller not found" },
        { status: 404 }
      );
    }

    // Return the Twilio activation status
    return NextResponse.json({ twilioActivated: user.twilioActivated });
  } catch (error) {
    console.error("Error fetching Twilio status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
